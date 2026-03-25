/**
 * @file pdf-extractor.ts
 * @description Extracts text from PDF or ZIP-of-PDFs buffers.
 * Uses pdf-parse v1.1.1 (pure Node.js, no DOMMatrix, works on Vercel).
 */

import JSZip from "jszip";
import pdfParse from "pdf-parse";

/**
 * Extracts text from a PDF buffer using pdf-parse (pure Node.js).
 * No browser APIs required — safe on Vercel serverless.
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extracts text from a given buffer.
 * Supports direct PDF buffers, or ZIP buffers containing PDFs.
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
        (file) => !file.dir && file.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) return "";

      for (const pdf of pdfFiles.slice(0, 5)) {
        try {
          const pdfBuffer = await pdf.async("nodebuffer");
          const text = await parsePdfBuffer(pdfBuffer);
          extractedText += `\n--- FROM ZIP: ${pdf.name} ---\n${text.slice(0, 3000)}\n`;
        } catch (err) {
          console.warn(`Failed to parse zipped PDF: ${pdf.name}`, err);
        }
      }
      return extractedText;
    } catch (err) {
      console.error("ZIP processing error:", err);
      return "";
    }
  } else {
    const text = await parsePdfBuffer(buffer);
    return text;
  }
}
