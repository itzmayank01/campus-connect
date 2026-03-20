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

    const result = await model.generateContent(userMessage)
    const response = result.response
    return response.text() || null
  } catch (error) {
    console.error("Gemini API error:", error)
    return null
  }
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
