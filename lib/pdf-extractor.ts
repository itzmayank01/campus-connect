/**
 * @file pdf-extractor.ts
 * @description Extracts text from PDF buffers using pdfjs-dist/legacy.
 *
 * WHY pdfjs-dist instead of pdf-parse:
 * pdf-parse v1.1.1 runs fs.readFileSync on a test PDF during module load.
 * This crashes in Vercel serverless because that path doesn't exist.
 * pdfjs-dist/legacy/build/pdf.mjs uses only pure JS — no native deps, no fs
 * calls at import time — works perfectly on Vercel Edge and serverless runtimes.
 *
 * My plan:
 * 1. Load pdfjs-dist lazily (dynamic import) so build phase never executes it
 * 2. Parse page by page, collect text content items
 * 3. Handle ZIP archives (up to 5 PDFs inside)
 * 4. Return clean combined text string
 */

import JSZip from "jszip";

/**
 * Extract plain text from a PDF buffer using pdfjs-dist/legacy.
 * Processes every page, joining text items with appropriate spacing.
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // Dynamic import avoids any module-level side-effects at build time
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Disable the worker in Node.js environment (not needed for text extraction)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,         // prevents font loading network calls
    disableFontFace: true,        // no DOM required
    verbosity: 0,                 // suppress console noise
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Join text items — preserve line breaks by checking y-position jumps
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = "";

    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5]; // y coordinate

      if (lastY !== null && Math.abs(y - lastY) > 5) {
        // New line detected
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine && !currentLine.endsWith(" ") ? " " : "") + textItem.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    pageTexts.push(lines.join("\n"));
  }

  return pageTexts.join("\n\n");
}

/**
 * Extracts text from a given buffer.
 * Supports: direct PDF buffers, or ZIP files containing PDFs.
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
