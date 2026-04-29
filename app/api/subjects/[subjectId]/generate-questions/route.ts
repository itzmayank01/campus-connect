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
    const { topic, mode = "questions" } = body
    // mode: "questions" = just questions, "questions_answers" = questions + answers

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
          examPredictorContext = `\nHigh Probability Topics: ${data.high_probability.map((t: any) => t.topic).join(", ")}`
        }
        if (data.medium_probability) {
          examPredictorContext += `\nMedium Probability Topics: ${data.medium_probability.map((t: any) => t.topic).join(", ")}`
        }
      }
    } catch {}

    const topicInstruction = topic 
      ? `Generate 6-7 most likely exam questions SPECIFICALLY about the topic "${topic}" for the course "${subject.name}".`
      : `Generate 6-7 most likely exam questions for the course "${subject.name}" covering the most important topics from the syllabus.`

    const answerInstruction = mode === "questions_answers"
      ? `For each question, also provide a concise but detailed answer (3-5 sentences or key points).`
      : `Do NOT provide answers, only questions.`

    const systemPrompt = `You are an exam question prediction expert for engineering students. 
${topicInstruction}
${answerInstruction}

${syllabusContext ? `COURSE SYLLABUS & TOPICS:\n${syllabusContext}\n` : ""}
${examPredictorContext ? `EXAM PREDICTION DATA:\n${examPredictorContext}\n` : ""}

Return ONLY valid JSON, no markdown. Use this format:
{
  "questions": [
    {
      "number": 1,
      "question": "The exam question text",
      "topic": "Related topic/unit",
      "importance": "high" | "medium",
      "marks": "e.g. 5 marks or 10 marks",
      ${mode === "questions_answers" ? '"answer": "Detailed answer text",' : ""}
      "type": "short_answer" | "long_answer" | "numerical" | "conceptual"
    }
  ],
  "total_questions": 7,
  "focus_topic": "${topic || "All important topics"}",
  "based_on": "syllabus analysis" | "general knowledge"
}`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate the most likely exam questions now for ${subject.name} (${subject.code}).${topic ? ` Focus on: ${topic}` : ""}` }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      top_p: 0.9,
    })

    const reply = completion.choices[0]?.message?.content || ""
    
    // Parse JSON from response
    const cleaned = reply.replace(/```json\n?|```\n?/g, "").trim()
    const questionsData = JSON.parse(cleaned)

    return NextResponse.json(questionsData)
  } catch (error: any) {
    console.error("Generate questions API error:", error)
    return NextResponse.json(
      { error: "Failed to generate questions", details: error?.message },
      { status: 500 }
    )
  }
}
