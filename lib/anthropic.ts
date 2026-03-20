import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY is not set — AI features will be disabled")
    return null
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 300
): Promise<string | null> {
  const anthropic = getClient()
  if (!anthropic) return null

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === "text")
    return textBlock ? textBlock.text : null
  } catch (error) {
    console.error("Claude API error:", error)
    return null
  }
}

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
