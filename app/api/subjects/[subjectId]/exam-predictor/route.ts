import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"

// GET /api/subjects/[subjectId]/exam-predictor — predict exam questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subjectId: id } = await params

    if (!isAiConfigured()) {
      return NextResponse.json({
        error: "AI features are not configured. Add GEMINI_API_KEY to enable.",
        predictions: null,
      })
    }

    // Check if we have a cached prediction (weekly TTL)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Look for existing predictions stored as a special metadata entry
    const cachedPrediction = await prisma.$queryRaw<
      Array<{
        id: string
        summary_bullets: string[]
        key_topics: string[]
        likely_exam_topics: string[]
        generated_at: Date
      }>
    >`
      SELECT ram.id, ram.summary_bullets, ram.key_topics, ram.likely_exam_topics, ram.generated_at
      FROM resource_ai_metadata ram
      JOIN resources r ON ram.resource_id = r.id
      WHERE r.subject_id = ${id}
        AND ram.difficulty_level = '__exam_predictor__'
        AND ram.generated_at > ${oneWeekAgo}
      LIMIT 1
    `

    if (cachedPrediction.length > 0) {
      const cached = cachedPrediction[0]
      return NextResponse.json({
        predictions: {
          veryLikely: cached.summary_bullets,
          likely: cached.key_topics,
          possible: cached.likely_exam_topics,
        },
        cached: true,
        generatedAt: cached.generated_at,
      })
    }

    // Get subject info
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { semester: true },
    })

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Get top PYQ resources for this subject
    const pyqResources = await prisma.resource.findMany({
      where: {
        subjectId: id,
        resourceType: "QUESTION_PAPERS",
        deletedAt: null,
        isPublic: true,
      },
      orderBy: { downloadCount: "desc" },
      take: 3,
    })

    // Also get most bookmarked notes
    const topNotes = await prisma.resource.findMany({
      where: {
        subjectId: id,
        resourceType: "NOTES",
        deletedAt: null,
        isPublic: true,
      },
      orderBy: { bookmarkCount: "desc" },
      take: 2,
    })

    // Extract text from PYQ PDFs
    let pyqText = ""
    for (const pyq of pyqResources) {
      if (pyq.s3Key && pyq.mimeType?.includes("pdf")) {
        try {
          const response = await s3Client.send(
            new GetObjectCommand({ Bucket: S3_BUCKET, Key: pyq.s3Key })
          )
          const bodyBytes = await response.Body?.transformToByteArray()
          if (bodyBytes) {
            const buffer = Buffer.from(bodyBytes)
            const pdfParse = require("pdf-parse")
            const data = await pdfParse(buffer)
            pyqText += `\n---PYQ: ${pyq.originalFilename}---\n${data.text.slice(0, 2000)}\n`
          }
        } catch {}
      }
    }

    // If no PYQ text, use note titles for context
    if (!pyqText) {
      const allResources = await prisma.resource.findMany({
        where: { subjectId: id, deletedAt: null, isPublic: true },
        select: { originalFilename: true, resourceType: true, downloadCount: true },
        orderBy: { downloadCount: "desc" },
        take: 20,
      })
      pyqText = `Available resources for ${subject.name}:\n${allResources.map((r) => `- ${r.originalFilename} (${r.resourceType}, ${r.downloadCount} downloads)`).join("\n")}`
    }

    const result = await callAI(
      `You are an exam pattern analyst for engineering university exams. Based on previous year questions and resource patterns, predict the most likely topics for the next exam. Return ONLY a JSON object:
{
  "very_likely": ["topic 1 - specific exam-style question", "topic 2", ...],
  "likely": ["topic 3", "topic 4", ...],
  "possible": ["topic 5", ...]
}
very_likely: 2-3 topics that appear most frequently. likely: 2-3 topics that appear moderately. possible: 1-2 topics that could appear. Format each as an exam-style question or specific topic.`,
      `Subject: ${subject.name} (${subject.code})
Semester: ${subject.semester?.number || "N/A"}
Number of PYQs analyzed: ${pyqResources.length}
Number of popular notes: ${topNotes.length}

Content from previous year questions and resources:
${pyqText}

Based on this analysis, predict the most likely exam topics.`
    )

    if (!result) {
      return NextResponse.json({
        error: "AI prediction failed",
        predictions: null,
      })
    }

    try {
      const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)

      // Cache the prediction using a resource's metadata entry
      // Find any resource for this subject to attach metadata to
      const anyResource = await prisma.resource.findFirst({
        where: { subjectId: id, deletedAt: null },
      })

      if (anyResource) {
        // Use upsert to avoid duplicates
        await prisma.resourceAiMetadata.upsert({
          where: { resourceId: anyResource.id },
          create: {
            resourceId: anyResource.id,
            summaryBullets: parsed.very_likely || [],
            keyTopics: parsed.likely || [],
            likelyExamTopics: parsed.possible || [],
            difficultyLevel: "__exam_predictor__",
          },
          update: {
            summaryBullets: parsed.very_likely || [],
            keyTopics: parsed.likely || [],
            likelyExamTopics: parsed.possible || [],
            difficultyLevel: "__exam_predictor__",
            generatedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        predictions: {
          veryLikely: parsed.very_likely || [],
          likely: parsed.likely || [],
          possible: parsed.possible || [],
        },
        cached: false,
        generatedAt: new Date(),
        pyqCount: pyqResources.length,
        subjectName: subject.name,
      })
    } catch {
      return NextResponse.json({
        error: "Failed to parse AI response",
        predictions: null,
      })
    }
  } catch (error: unknown) {
    console.error("Exam predictor error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate predictions", details: message },
      { status: 500 }
    )
  }
}
