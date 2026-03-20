import { GoogleGenerativeAI } from "@google/generative-ai"

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set — AI features will be disabled")
    return null
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

const AI_TIMEOUT_MS = 8000 // 8 second max — never block longer

export async function callAI(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const client = getClient()
  if (!client) return null

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    })

    // Race between AI call and timeout — never block for more than 8 seconds
    const result = await Promise.race([
      model.generateContent(userMessage),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS)
      ),
    ])

    const response = result.response
    return response.text() || null
  } catch (error: any) {
    if (error?.message === "AI_TIMEOUT") {
      console.warn("Gemini API timed out after 8 seconds — returning null")
    } else {
      console.error("Gemini API error:", error)
    }
    return null
  }
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
