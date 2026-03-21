import { callAI } from "@/lib/anthropic"

export async function generateTags(
  subjectName: string,
  filename: string,
  contentPreview: string,
  resourceType: string
): Promise<string[]> {
  const result = await callAI(
    `Generate 3-5 relevant academic tags for this resource. Return ONLY a JSON array of strings. Tags should be lowercase, specific, and useful for search. Example: ["unit-1", "er-diagrams", "normalization", "important", "exam-prep"]`,
    `Subject: ${subjectName}
Filename: ${filename}
Content preview: ${contentPreview.slice(0, 500)}
Resource type: ${resourceType}`
  )

  if (!result) return []

  try {
    const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
    const tags = JSON.parse(cleaned)
    if (Array.isArray(tags)) {
      return tags
        .filter((t: unknown) => typeof t === "string")
        .map((t: string) => t.toLowerCase().trim())
        .slice(0, 5)
    }
    return []
  } catch {
    return []
  }
}
