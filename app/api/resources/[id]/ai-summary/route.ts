import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

// GET /api/resources/[id]/ai-summary — generate or return cached AI summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check cache first
    const cached = await prisma.resourceAiMetadata.findUnique({
      where: { resourceId: id },
    })

    if (cached) {
      return NextResponse.json({
        bullets: cached.summaryBullets,
        topics: cached.keyTopics,
        examTopics: cached.likelyExamTopics,
        readTime: cached.estimatedReadMinutes,
        difficulty: cached.difficultyLevel,
        cached: true,
      })
    }

    // Get resource
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { subject: true },
    })

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    if (!isAiConfigured()) {
      return NextResponse.json({
        error: "AI features are not configured. Add GEMINI_API_KEY to enable.",
        bullets: [],
        topics: [],
        examTopics: [],
        readTime: null,
        difficulty: null,
      })
    }

    // Extract PDF/ZIP text
    let extractedText = ""
    const mime = resource.mimeType
    const name = resource.originalFilename
    const isExtractable = !mime || mime.includes("pdf") || mime.includes("zip") || mime.includes("octet-stream") || name.toLowerCase().endsWith(".pdf") || name.toLowerCase().endsWith(".zip") || !name.includes(".")

    if (resource.s3Key && isExtractable) {
      try {
        const response = await s3Client.send(
          new GetObjectCommand({ Bucket: S3_BUCKET, Key: resource.s3Key })
        )
        const bodyBytes = await response.Body?.transformToByteArray()
        if (bodyBytes) {
          const buffer = Buffer.from(bodyBytes)
          extractedText = await extractTextFromBuffer(buffer, resource.originalFilename)
          // Limit to 4000 characters for summary payload
          extractedText = extractedText.slice(0, 4000)
        }
      } catch (err) {
        console.error("Extraction error:", err)
        return NextResponse.json({
          error: "Could not extract content from the file",
          bullets: [],
          topics: [],
          examTopics: [],
          readTime: null,
          difficulty: null,
        })
      }
    } else {
      return NextResponse.json({
        error: "AI summary is only available for PDF or ZIP files",
        bullets: [],
        topics: [],
        examTopics: [],
        readTime: null,
        difficulty: null,
      })
    }

    if (extractedText.length < 50) {
      return NextResponse.json({
        error: "Not enough text content to generate summary",
        bullets: [],
        topics: [],
        examTopics: [],
        readTime: null,
        difficulty: null,
      })
    }

    // Call Claude for summary
    const result = await callAI(
      `You are an academic content analyst. Analyze the given study material and return ONLY a JSON object with these fields:
{
  "summary_bullets": ["bullet point 1", "bullet point 2", ...],
  "key_topics": ["topic1", "topic2", ...],
  "likely_exam_topics": ["exam question topic 1", ...],
  "estimated_read_minutes": number,
  "difficulty_level": "Beginner" | "Intermediate" | "Advanced"
}
INSTRUCTIONS for summary_bullets:
- Make the summary extremely crisp, short, and highly relevant.
- Do NOT write huge theory blocks or lengthy paragraphs.
- Keep each point strictly to a single, impactful sentence about the most vital concepts.

Key topics should be 3-6 specific core terms. Exam topics should be 3-5 highly likely exam questions/areas directly based on this text. Estimate read time based on length.`,
      `Subject: ${resource.subject?.name || "Unknown"} (${resource.subject?.code || "N/A"})
Filename: ${resource.originalFilename}

Content:
${extractedText}`
    )

    if (!result) {
      return NextResponse.json({
        error: "AI generation failed",
        bullets: [],
        topics: [],
        examTopics: [],
        readTime: null,
        difficulty: null,
      })
    }

    try {
      const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)

      // Cache the result
      await prisma.resourceAiMetadata.create({
        data: {
          resourceId: id,
          summaryBullets: parsed.summary_bullets || [],
          keyTopics: parsed.key_topics || [],
          likelyExamTopics: parsed.likely_exam_topics || [],
          estimatedReadMinutes: parsed.estimated_read_minutes || null,
          difficultyLevel: parsed.difficulty_level || null,
        },
      })

      return NextResponse.json({
        bullets: parsed.summary_bullets || [],
        topics: parsed.key_topics || [],
        examTopics: parsed.likely_exam_topics || [],
        readTime: parsed.estimated_read_minutes || null,
        difficulty: parsed.difficulty_level || null,
        cached: false,
      })
    } catch {
      return NextResponse.json({
        error: "Failed to parse AI response",
        bullets: [],
        topics: [],
        examTopics: [],
        readTime: null,
        difficulty: null,
      })
    }
  } catch (error: unknown) {
    console.error("AI summary error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate AI summary", details: message },
      { status: 500 }
    )
  }
}
