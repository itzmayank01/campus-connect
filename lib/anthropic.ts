import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[AI] GEMINI_API_KEY is not set — AI features disabled")
    return null
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    console.log("[AI] Gemini client initialized with key:", process.env.GEMINI_API_KEY?.slice(0, 8) + "...")
  }
  return genAI
}

const AI_TIMEOUT_MS = 30000 // 30 seconds

// Models to try in order (fallback chain)
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]

// Safety settings to allow the model to analyze problematic content without being blocked
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  fileAttachment?: { buffer: Buffer; mimeType: string }
): Promise<string | null> {
  const client = getClient()
  if (!client) {
    console.warn("[AI] No client — GEMINI_API_KEY not set")
    return null
  }

  // Combine system prompt into the user message for maximum compatibility
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`

  // Prepare parts array
  const parts: any[] = [{ text: combinedPrompt }]
  
  // Attach file if provided, supported, and under 19MB (Gemini inline data limit is ~20MB)
  const SUPPORTED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
  if (
    fileAttachment && 
    SUPPORTED_MIMES.includes(fileAttachment.mimeType) && 
    fileAttachment.buffer.length < 19 * 1024 * 1024
  ) {
    parts.unshift({
      inlineData: {
        data: fileAttachment.buffer.toString("base64"),
        mimeType: fileAttachment.mimeType,
      }
    })
    console.log(`[AI] Attaching file inline: ${fileAttachment.mimeType} (${Math.round(fileAttachment.buffer.length/1024)}KB)`)
  }

  for (const modelName of MODELS) {
    try {
      console.log(`[AI] Trying model: ${modelName}`)
      const model = client.getGenerativeModel({ model: modelName })

      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: "user", parts }],
          safetySettings: SAFETY_SETTINGS,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS)
        ),
      ])

      const response = result.response
      const text = response.text()
      if (text) {
        console.log(`[AI] ${modelName} success (${text.length} chars)`)
        return text
      }
      console.warn(`[AI] ${modelName} returned empty`)
    } catch (error: any) {
      const msg = error?.message || String(error)
      if (msg === "AI_TIMEOUT") {
        console.warn(`[AI] ${modelName} timed out (${AI_TIMEOUT_MS / 1000}s)`)
      } else {
        console.error(`[AI] ${modelName} error: ${msg}`)
      }
      // Try next model
      continue
    }
  }

  console.error("[AI] All models failed — returning null")
  return null
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
