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
 * The file must already be in S3 (which it always is for campus-connect resources).
 * We start an async Textract job and poll until it completes (max ~50 s).
 */

import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from "@aws-sdk/client-textract";

let _textract: TextractClient | null = null;
function getTextract(): TextractClient {
  if (!_textract) {
    _textract = new TextractClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _textract;
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
 * @param s3Key - The object key of the PDF in the configured S3 bucket.
 * @param maxWaitMs - Maximum milliseconds to poll before giving up (default 50 s).
 * @returns Extracted plain text, or throws on failure / timeout.
 */
export async function extractTextWithTextract(
  s3Key: string,
  maxWaitMs = 50_000
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET!;

  // ── Start the async Textract job ──────────────────────────────────────────
  const startResult = await getTextract().send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: s3Key } },
    })
  );

  const jobId = startResult.JobId;
  if (!jobId) throw new Error("[Textract] No JobId returned from StartDocumentTextDetection");

  console.log(`[Textract] Started OCR job ${jobId} for s3://${bucket}/${s3Key}`);

  // ── Poll for completion ───────────────────────────────────────────────────
  const pollMs      = 2_500;
  const maxAttempts = Math.ceil(maxWaitMs / pollMs);

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
}
