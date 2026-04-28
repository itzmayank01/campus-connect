import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Groq from "groq-sdk"

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

async function getSyllabusContext(subjectId: string): Promise<string> {
  // First try cached syllabus topics
  try {
    const cached = await prisma.subjectAiCache.findUnique({
      where: {
        subjectId_cacheType: {
          subjectId,
          cacheType: "syllabus_topics"
        }
      }
    })
    if (cached?.cacheData) {
      const data = cached.cacheData as any
      const parts: string[] = []
      if (data.units) {
        data.units.forEach((u: any) => {
          parts.push(`Unit ${u.unit_number}: ${u.unit_name} (Importance: ${u.importance}, Exam weightage: ${u.exam_weightage})`)
          parts.push(`Topics: ${u.topics?.join(", ")}`)
        })
      }
      if (data.most_important_overall) {
        parts.push(`\nMost Important Overall Topics: ${data.most_important_overall.join(", ")}`)
      }
      if (data.course_objectives) {
        parts.push(`Course Objectives: ${data.course_objectives.join(", ")}`)
      }
      return parts.join("\n")
    }
  } catch {}

  // Fallback: try to get extracted text from syllabus resource
  try {
    const syllabus = await prisma.resource.findFirst({
      where: {
        subjectId,
        resourceType: "SYLLABUS",
        deletedAt: null,
        isPublic: true,
        textExtracted: true,
      },
      orderBy: { createdAt: "desc" },
      select: { extractedText: true, originalFilename: true }
    })
    if (syllabus?.extractedText) {
      return syllabus.extractedText.slice(0, 8000)
    }
  } catch {}

  return ""
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message, history = [] } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get subject info
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true }
    })

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Get syllabus context
    const syllabusContext = await getSyllabusContext(subjectId)

    // Also fetch exam predictor cache for extra context
    let examPredictorContext = ""
    try {
      const examCache = await prisma.subjectAiCache.findUnique({
        where: {
          subjectId_cacheType: {
            subjectId,
            cacheType: "exam_predictions"
          }
        }
      })
      if (examCache?.cacheData) {
        const data = examCache.cacheData as any
        if (data.high_probability) {
          examPredictorContext = `\nExam Predictions (High Probability Topics): ${data.high_probability.map((t: any) => t.topic).join(", ")}`
        }
        if (data.medium_probability) {
          examPredictorContext += `\nMedium Probability Topics: ${data.medium_probability.map((t: any) => t.topic).join(", ")}`
        }
      }
    } catch {}

    const systemPrompt = `You are "StudyBot", an intelligent AI study assistant for the course "${subject.name}" (Code: ${subject.code}, Semester ${subject.semester?.number || "N/A"}).

You help students prepare for exams by:
1. Generating important exam questions (provide 6-7 questions when asked)
2. Providing answers when requested
3. Identifying most important and less important topics
4. Explaining concepts clearly
5. Predicting likely exam topics

${syllabusContext ? `COURSE SYLLABUS & TOPICS:\n${syllabusContext}\n` : ""}
${examPredictorContext ? `EXAM PREDICTION DATA:\n${examPredictorContext}\n` : ""}

RULES:
- Always respond in a structured, well-formatted way using markdown
- When generating questions, number them clearly (Q1, Q2, etc.)
- When asked for "important questions", provide 6-7 exam-style questions from the most important topics
- When asked for answers too, provide both questions AND detailed answers
- Categorize topics as "Most Important 🔴", "Important 🟡", "Good to Know 🟢" when discussing topic importance
- Be encouraging and supportive
- Use bullet points and headers for clarity
- If syllabus data is available, base your answers on it. If not, use general knowledge of the subject.
- Keep answers exam-focused and practical`

    // Build messages for Groq
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history (last 10 messages)
    const recentHistory = history.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      })
    }

    // Add current message
    messages.push({ role: "user", content: message })

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
    })

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to get AI response", details: error?.message },
      { status: 500 }
    )
  }
}
