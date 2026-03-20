import JSZip from "jszip"

/**
 * Extracts text from a given buffer.
 * Supports processing direct PDF buffers, or ZIP buffers containing PDFs.
 */
export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const isZip = filename.toLowerCase().endsWith(".zip")

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
          const pdfParse = require("pdf-parse")
          const data = await pdfParse(pdfBuffer)
          extractedText += `\n--- FROM ZIP: ${pdf.name} ---\n${data.text.slice(0, 3000)}\n`
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
      const pdfParse = require("pdf-parse")
      const data = await pdfParse(buffer)
      return data.text
    } catch (err) {
      console.error("Single PDF processing error:", err)
      throw err
    }
  }
}
