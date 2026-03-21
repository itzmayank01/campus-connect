import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { callAI, isAiConfigured } from "@/lib/anthropic"

export const maxDuration = 60;

// POST /api/ai/study-tip — generate personalized study tip
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAiConfigured()) {
      return NextResponse.json({
        tip: null,
        error: "AI features are not configured. Add GEMINI_API_KEY to enable.",
      })
    }

    const body = await request.json()
    const { query, searchCount, resourceTitles } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const resourceList = Array.isArray(resourceTitles)
      ? resourceTitles.slice(0, 10).join(", ")
      : "various study materials"

    const result = await callAI(
      `You are an academic advisor for engineering students. Given a student's search history and available resources, write a 2-sentence personalized study tip. Be specific, encouraging, and academic. Never be generic. Reference the actual subject name.`,
      `Student searched '${query}' ${searchCount || 2} times. Available resources: ${resourceList}. Current date: ${new Date().toLocaleDateString("en-IN")}. Write a personalized 2-sentence tip.`
    )

    return NextResponse.json({
      tip: result || "Keep exploring resources on this topic — consistent study leads to mastery!",
    })
  } catch (error: unknown) {
    console.error("Study tip error:", error)
    return NextResponse.json({
      tip: "Keep exploring resources on this topic — consistent study leads to mastery!",
    })
  }
}
