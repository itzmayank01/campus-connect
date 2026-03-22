import JSZip from "jszip"

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str);
    pages.push(strings.join(" "));
  }
  return pages.join("\n\n");
}
/**
 * Extracts text from a given buffer.
 * Supports processing direct PDF buffers, or ZIP buffers containing PDFs.
 */
export async function extractTextFromBuffer(buffer: Buffer, filename: string, mimeType?: string): Promise<string> {
  // Sniff magic bytes or fallback to mime/extension
  const isZipBuffer = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B
  const isZip = isZipBuffer || filename.toLowerCase().endsWith(".zip") || mimeType?.includes("zip") || mimeType?.includes("archive")

  if (isZip) {
    let extractedText = ""
    try {
      const zip = await JSZip.loadAsync(buffer)
      const pdfFiles = Object.values(zip.files).filter((file) => 
        !file.dir && file.name.toLowerCase().endsWith(".pdf")
      )

      if (pdfFiles.length === 0) {
        return ""
      }

      // Process up to 5 PDFs from the zip to avoid massive processing
      for (const pdf of pdfFiles.slice(0, 5)) {
        try {
          const pdfBuffer = await pdf.async("nodebuffer")
          const text = await parsePdfBuffer(pdfBuffer)
          extractedText += `\n--- FROM ZIP: ${pdf.name} ---\n${text.slice(0, 3000)}\n`
        } catch (err) {
          console.warn(`Failed to parse zipped PDF: ${pdf.name}`)
        }
      }
      return extractedText
    } catch (err) {
      console.error("ZIP processing error:", err)
      return ""
    }
  } else {
    // Process single PDF
    try {
      const text = await parsePdfBuffer(buffer)
      return text
    } catch (err) {
      console.error("Single PDF processing error:", err)
      throw err
    }
  }
}
