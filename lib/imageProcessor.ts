/**
 * @file imageProcessor.ts
 * @description Converts uploaded images to a Textract-compatible format.
 *
 * iPhone HEIC files → JPEG (Textract accepts JPEG, PNG, PDF — NOT HEIC)
 * JPEG/PNG files → auto-rotated via EXIF and passed through
 * PDF files → passed through to Textract PDF pipeline
 *
 * Why sharp? It handles HEIC natively via libvips, is MIT licensed,
 * runs server-side in Next.js API routes, and produces high-quality output.
 */

import sharp from "sharp";

export interface ProcessedImage {
  buffer:       Buffer;
  mimeType:     string;   // "image/jpeg" | "image/png" | "application/pdf"
  extension:    string;   // "jpg" | "png" | "pdf"
  originalType: string;   // original mime type before conversion
  wasConverted: boolean;
}

/**
 * Process an uploaded file buffer.
 * Converts HEIC to JPEG. Normalizes JPEG/PNG orientation. Passes PDF through.
 * Throws if file type is not supported.
 */
export async function processUploadedFile(
  buffer:   Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessedImage> {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = filename.toLowerCase();

  // ── HEIC / HEIF (iPhone default format) ──────────────────────────────
  if (
    lowerMime.includes("heic") ||
    lowerMime.includes("heif") ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  ) {
    const converted = await sharp(buffer)
      .rotate()                    // Auto-rotate based on EXIF orientation
      .jpeg({
        quality:     90,           // High quality for Textract accuracy
        progressive: false,
      })
      .toBuffer();

    return {
      buffer:       converted,
      mimeType:     "image/jpeg",
      extension:    "jpg",
      originalType: mimeType,
      wasConverted: true,
    };
  }

  // ── JPEG ──────────────────────────────────────────────────────────────
  if (
    lowerMime.includes("jpeg") || lowerMime.includes("jpg") ||
    lowerName.endsWith(".jpg")  || lowerName.endsWith(".jpeg")
  ) {
    // Auto-rotate based on EXIF (fixes sideways iPhone photos)
    const rotated = await sharp(buffer).rotate().jpeg({ quality: 90 }).toBuffer();
    return {
      buffer:       rotated,
      mimeType:     "image/jpeg",
      extension:    "jpg",
      originalType: mimeType,
      wasConverted: false,
    };
  }

  // ── PNG ───────────────────────────────────────────────────────────────
  if (lowerMime.includes("png") || lowerName.endsWith(".png")) {
    return {
      buffer,
      mimeType:     "image/png",
      extension:    "png",
      originalType: mimeType,
      wasConverted: false,
    };
  }

  // ── PDF ───────────────────────────────────────────────────────────────
  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
    return {
      buffer,
      mimeType:     "application/pdf",
      extension:    "pdf",
      originalType: mimeType,
      wasConverted: false,
    };
  }

  // ── Word documents ────────────────────────────────────────────────────
  if (
    lowerMime.includes("word") ||
    lowerMime.includes("docx") ||
    lowerMime.includes("openxmlformats") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    return {
      buffer,
      mimeType:     mimeType,
      extension:    lowerName.endsWith(".docx") ? "docx" : "doc",
      originalType: mimeType,
      wasConverted: false,
    };
  }

  throw new Error(
    `Unsupported file type: ${mimeType}. ` +
    `Supported: HEIC (iPhone photos), JPEG, PNG, PDF, DOCX.`
  );
}

/**
 * Check if a file is an image type (for choosing Textract mode).
 */
export function isImageFile(mimeType: string): boolean {
  const m = mimeType.toLowerCase();
  return (
    m.includes("jpeg") ||
    m.includes("jpg")  ||
    m.includes("png")  ||
    m.includes("heic") ||
    m.includes("heif")
  );
}
