/**
 * @file textract-ocr.ts
 * @description AWS Textract-based OCR for scanned / handwritten PDFs.
 *
 * WHY Textract and not a JS library:
 * - Handwritten PDFs have no text layer — pdf-parse returns "" for them.
 * - pdfjs-dist needs DOMMatrix (browser API) to render pages → crashes on Vercel.
 * - Textract is a managed AWS service: no native binaries, works perfectly on
 *   Vercel serverless, and is purpose-built for handwritten text recognition.
 *
 * CROSS-ACCOUNT STRATEGY:
 * The user's files are stored in S3 account A (556683673939), but Textract
 * permissions are in account B (616551057703). To bridge this:
 *   1. Download the PDF from account A's S3 (using AWS_* credentials).
 *   2. Upload to a temp bucket in account B (using TEXTRACT_AWS_* credentials).
 *   3. Run Textract async job in account B.
 *   4. Clean up the temp file.
 */

import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from "@aws-sdk/client-textract";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getTextractCredentials } from "./textract";

// ─── Clients ──────────────────────────────────────────────────────────────────

/** Textract client — uses the Textract-specific credentials (account B). */
let _textract: TextractClient | null = null;
function getTextract(): TextractClient {
  if (!_textract) {
    const creds = getTextractCredentials();
    _textract = new TextractClient({
      region: creds.region,
      credentials: {
        accessKeyId:     creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
  }
  return _textract;
}

/** S3 client for the ORIGINAL bucket (account A) — downloads the file. */
let _s3Source: S3Client | null = null;
function getS3Source(): S3Client {
  if (!_s3Source) {
    _s3Source = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Source;
}

/** S3 client for the TEXTRACT TEMP bucket (account B) — uploads for OCR. */
let _s3Textract: S3Client | null = null;
function getS3Textract(): S3Client {
  if (!_s3Textract) {
    const creds = getTextractCredentials();
    _s3Textract = new S3Client({
      region: creds.region,
      credentials: {
        accessKeyId:     creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
  }
  return _s3Textract;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a readable stream to a Buffer. */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Collect all LINE blocks from a completed Textract job (handles pagination).
 */
async function collectLines(jobId: string): Promise<string[]> {
  const lines: string[] = [];
  let nextToken: string | undefined;

  do {
    const result = await getTextract().send(
      new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: nextToken })
    );
    for (const block of result.Blocks ?? []) {
      if (block.BlockType === "LINE" && block.Text) {
        lines.push(block.Text);
      }
    }
    nextToken = result.NextToken;
  } while (nextToken);

  return lines;
}

/**
 * Extract text from a PDF stored in S3 using AWS Textract.
 * Handles typed, scanned, AND handwritten content.
 *
 * Cross-account flow:
 *   1. Download from source S3 bucket (account A).
 *   2. Upload to Textract temp bucket (account B).
 *   3. Start async Textract job on the temp copy.
 *   4. Poll for completion and collect results.
 *   5. Clean up the temp file.
 *
 * @param s3Key     - The object key of the PDF in the source S3 bucket.
 * @param maxWaitMs - Maximum milliseconds to poll before giving up (default 90s).
 * @returns Extracted plain text, or throws on failure / timeout.
 */
export async function extractTextWithTextract(
  s3Key: string,
  maxWaitMs = 90_000
): Promise<string> {
  const sourceBucket   = process.env.AWS_S3_BUCKET!;
  const textractBucket = process.env.TEXTRACT_S3_BUCKET || "campus-connect-textract-temp";
  const tempKey        = `textract-temp/${Date.now()}-${s3Key.replace(/\//g, "_")}`;

  console.log(`[Textract] Starting cross-account OCR for s3://${sourceBucket}/${s3Key}`);

  // ── Step 1: Download from source S3 ───────────────────────────────────────
  let fileBuffer: Buffer;
  try {
    const getResult = await getS3Source().send(
      new GetObjectCommand({ Bucket: sourceBucket, Key: s3Key })
    );
    fileBuffer = await streamToBuffer(getResult.Body as Readable);
    console.log(`[Textract] Downloaded ${(fileBuffer.length / 1024).toFixed(0)}KB from source`);
  } catch (err) {
    throw new Error(`[Textract] Failed to download from source S3: ${(err as Error).message}`);
  }

  // ── Step 2: Upload to Textract temp bucket ────────────────────────────────
  try {
    await getS3Textract().send(
      new PutObjectCommand({
        Bucket:      textractBucket,
        Key:         tempKey,
        Body:        fileBuffer,
        ContentType: "application/pdf",
      })
    );
    console.log(`[Textract] Uploaded temp copy to s3://${textractBucket}/${tempKey}`);
  } catch (err) {
    throw new Error(`[Textract] Failed to upload to Textract temp bucket: ${(err as Error).message}`);
  }

  // ── Step 3: Start the async Textract job ──────────────────────────────────
  let jobId: string;
  try {
    const startResult = await getTextract().send(
      new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: textractBucket, Name: tempKey } },
      })
    );
    jobId = startResult.JobId!;
    if (!jobId) throw new Error("No JobId returned");
    console.log(`[Textract] Started OCR job ${jobId}`);
  } catch (err) {
    // Clean up temp file on start failure
    await cleanupTemp(textractBucket, tempKey);
    throw new Error(`[Textract] Failed to start job: ${(err as Error).message}`);
  }

  // ── Step 4: Poll for completion ───────────────────────────────────────────
  const pollMs     = 2_500;
  const maxAttempts = Math.ceil(maxWaitMs / pollMs);

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollMs));

      const status = await getTextract().send(
        new GetDocumentTextDetectionCommand({ JobId: jobId })
      );

      if (status.JobStatus === "SUCCEEDED") {
        const lines = await collectLines(jobId);
        const text  = lines.join("\n").trim();
        console.log(`[Textract] OCR complete — ${lines.length} lines extracted (attempt ${attempt})`);
        return text;
      }

      if (status.JobStatus === "FAILED") {
        throw new Error(`[Textract] Job ${jobId} failed: ${status.StatusMessage}`);
      }

      console.log(`[Textract] Attempt ${attempt}/${maxAttempts} — status: ${status.JobStatus}`);
    }

    throw new Error(`[Textract] OCR timed out after ${maxWaitMs / 1000}s for key: ${s3Key}`);
  } finally {
    // ── Step 5: Always clean up temp file ─────────────────────────────────
    await cleanupTemp(textractBucket, tempKey);
  }
}

/** Silently clean up the temp file from the Textract bucket. */
async function cleanupTemp(bucket: string, key: string) {
  try {
    await getS3Textract().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
    console.log(`[Textract] Cleaned up temp file s3://${bucket}/${key}`);
  } catch {
    // Non-critical — lifecycle policy will clean up within 24h
    console.warn(`[Textract] Failed to clean up temp file (non-critical)`);
  }
}
