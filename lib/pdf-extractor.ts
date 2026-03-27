/**
 * @file pdf-extractor.ts
 * @description Extracts text from PDF buffers using pdf-parse.
 *
 * WHY pdf-parse/lib/pdf-parse (not the default import):
 * The root index.js of pdf-parse calls fs.readFileSync on a test PDF at module
 * load time. On Vercel serverless that path doesn't exist → crash at cold start.
 * Importing directly from lib/pdf-parse bypasses that side-effect entirely.
 *
 * WHY NOT pdfjs-dist/legacy:
 * pdfjs-dist (even the "legacy" build) references DOMMatrix, DOMRect, and other
 * browser globals that do not exist in Node.js serverless runtimes → crashes with
 * "ReferenceError: DOMMatrix is not defined" on every Vercel invocation.
 */

import JSZip from "jszip";

/**
 * Extract plain text from a PDF buffer using pdf-parse.
 * Safe to call in Vercel serverless — no module-level side effects.
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // Dynamic import of the internal module — skips the test-file fs.readFileSync
  // that lives in pdf-parse/index.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const result = await pdfParse(buffer);
  return result.text as string;
}

/**
 * Extracts text from a given buffer.
 * Supports: direct PDF buffers, or ZIP files containing up to 5 PDFs.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const isZipBuffer =
    buffer.length > 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b;

  const isZip =
    isZipBuffer ||
    filename.toLowerCase().endsWith(".zip") ||
    mimeType?.includes("zip") ||
    mimeType?.includes("archive");

  if (isZip) {
    let extractedText = "";
    try {
      const zip = await JSZip.loadAsync(buffer);
      const pdfFiles = Object.values(zip.files).filter(
        (f) => !f.dir && f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) return "";

      for (const pdf of pdfFiles.slice(0, 5)) {
        try {
          const pdfBuffer = await pdf.async("nodebuffer");
          const text = await parsePdfBuffer(pdfBuffer);
          extractedText += `\n--- ${pdf.name} ---\n${text.slice(0, 4000)}\n`;
        } catch (err) {
          console.warn(`[pdf-extractor] Failed to parse ${pdf.name}:`, err);
        }
      }
      return extractedText;
    } catch (err) {
      console.error("[pdf-extractor] ZIP processing error:", err);
      return "";
    }
  }

  return parsePdfBuffer(buffer);
}
