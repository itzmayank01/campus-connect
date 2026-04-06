/**
 * @file textract.ts
 * @description AWS Textract wrapper for text extraction from images and PDFs.
 *
 * Two modes:
 * 1. Inline (AnalyzeDocument) — for images (JPEG/PNG), max 10MB, single page.
 *    Uses FORMS feature for handwriting detection on notes.
 * 2. Async (StartDocumentTextDetection) — for PDFs, multi-page, S3-based.
 *    Re-exports the existing textract-ocr.ts function for this.
 *
 * Cost: Textract free tier = 1000 pages/month free.
 */

import {
  TextractClient,
  AnalyzeDocumentCommand,
  type AnalyzeDocumentCommandInput,
  type Block,
  BlockType,
  FeatureType,
} from "@aws-sdk/client-textract";

// Re-export the async S3-based extractor for PDFs
export { extractTextWithTextract } from "./textract-ocr";

// ─── Client ───────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextractResult {
  extractedText:  string;   // Full plain text, newline-separated
  confidence:     number;   // Average confidence score (0-100)
  wordCount:      number;
  hasHandwriting: boolean;
  pageCount:      number;
}

// ─── Inline extraction (for images — JPEG/PNG) ───────────────────────────────

/**
 * Extract text from an image buffer using AWS Textract AnalyzeDocument.
 * Handles handwritten and printed text on single-page images.
 *
 * @param buffer    File buffer (JPEG or PNG — NOT HEIC, NOT PDF)
 * @param mimeType  The processed mime type after conversion
 * @returns         Extracted text and metadata
 */
export async function extractTextFromImageBuffer(
  buffer:   Buffer,
  mimeType: string
): Promise<TextractResult> {
  // Validate size (Textract inline limit is 10MB)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error(
      `File too large (${Math.round(buffer.length / 1024 / 1024)}MB). ` +
      `Maximum size for image extraction is 10MB.`
    );
  }

  if (buffer.length < 1000) {
    throw new Error("File appears to be empty or corrupt.");
  }

  const input: AnalyzeDocumentCommandInput = {
    Document: {
      Bytes: buffer,
    },
    FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
  };

  let response;
  try {
    response = await getTextract().send(new AnalyzeDocumentCommand(input));
  } catch (err: unknown) {
    const error = err as Error & { name?: string };

    if (error.name === "UnsupportedDocumentException") {
      throw new Error(
        "The image quality is too low for text extraction. " +
        "Please take a clearer photo with better lighting."
      );
    }
    if (error.name === "DocumentTooLargeException") {
      throw new Error(
        "The file is too large (max 10MB). Please compress the image."
      );
    }
    if (error.name === "AccessDeniedException") {
      throw new Error(
        "AWS Textract permission denied. Check IAM policy includes textract:AnalyzeDocument."
      );
    }
    throw new Error(`Text extraction failed: ${error.message ?? "Unknown AWS error"}`);
  }

  const blocks: Block[] = response.Blocks ?? [];

  // ── Extract and assemble text ─────────────────────────────────────────────
  const lines: string[] = [];
  let totalConfidence = 0;
  let hasHandwriting  = false;

  const lineBlocks = blocks.filter(b => b.BlockType === BlockType.LINE);

  for (const line of lineBlocks) {
    if (!line.Text) continue;
    lines.push(line.Text);
    if (line.Confidence) {
      totalConfidence += line.Confidence;
    }
    // Lower confidence lines are likely handwritten
    if (line.Confidence && line.Confidence < 85) {
      hasHandwriting = true;
    }
  }

  const wordBlocks = blocks.filter(b => b.BlockType === BlockType.WORD);
  const wordCount  = wordBlocks.length;

  const avgConfidence = lineBlocks.length > 0
    ? totalConfidence / lineBlocks.length
    : 0;

  const extractedText = lines.join("\n").trim();

  if (!extractedText || extractedText.length < 5) {
    throw new Error(
      "Could not extract readable text from this image. " +
      "For handwritten notes: ensure good lighting, the page is flat, " +
      "and writing is clear."
    );
  }

  return {
    extractedText,
    confidence:    Math.round(avgConfidence),
    wordCount,
    hasHandwriting,
    pageCount:     1,
  };
}
