import { GoogleGenerativeAI } from "@google/generative-ai"

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[AI] GEMINI_API_KEY is not set — AI features will be disabled")
    return null
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    console.log("[AI] Gemini client initialized")
  }
  return genAI
}

const AI_TIMEOUT_MS = 30000 // 30 second max

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"] // fallback chain

export async function callAI(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const client = getClient()
  if (!client) {
    console.warn("[AI] No client available — GEMINI_API_KEY missing")
    return null
  }

  for (const modelName of MODELS) {
    try {
      console.log(`[AI] Calling model: ${modelName}`)
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      })

      const result = await Promise.race([
        model.generateContent(userMessage),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS)
        ),
      ])

      const response = result.response
      const text = response.text()
      if (text) {
        console.log(`[AI] ${modelName} responded successfully (${text.length} chars)`)
        return text
      }
      console.warn(`[AI] ${modelName} returned empty response`)
    } catch (error: any) {
      const msg = error?.message || "Unknown error"
      if (msg === "AI_TIMEOUT") {
        console.warn(`[AI] ${modelName} timed out after ${AI_TIMEOUT_MS / 1000}s`)
      } else {
        console.error(`[AI] ${modelName} error:`, msg)
      }
      // Try next model in fallback chain
      continue
    }
  }

  console.error("[AI] All models failed")
  return null
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
