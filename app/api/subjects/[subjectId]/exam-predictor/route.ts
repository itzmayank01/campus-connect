import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

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

    // 1. Gather Syllabus / Notes for the current subject to establish context
    const syllabusResources = await prisma.resource.findMany({
      where: { subjectId: id, resourceType: { in: ["SYLLABUS", "NOTES", "REFERENCE"] }, deletedAt: null, isPublic: true },
      orderBy: { downloadCount: "desc" },
      take: 5
    })

    const isExtractable = (mime: string | null, name: string) => 
      !mime || mime.includes("pdf") || mime.includes("zip") || mime.includes("octet-stream") || name.toLowerCase().endsWith(".pdf") || name.toLowerCase().endsWith(".zip") || !name.includes(".")

    let syllabusText = ""
    for (const file of syllabusResources) {
       if (file.s3Key && isExtractable(file.mimeType, file.originalFilename)) {
          try {
            const response = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: file.s3Key }))
            const bodyBytes = await response.Body?.transformToByteArray()
            if (bodyBytes) {
              const buffer = Buffer.from(bodyBytes)
              const text = await extractTextFromBuffer(buffer, file.originalFilename)
              if (text.trim().length > 50) {
                syllabusText += `\n--- SYLLABUS/NOTES: ${file.originalFilename} ---\n${text.slice(0, 3000)}\n`
                break // Got enough syllabus context from the top file
              }
            }
          } catch {}
       }
    }

    // 2. Gather PYQs for the local subject
    let pyqResources = await prisma.resource.findMany({
      where: { subjectId: id, resourceType: "QUESTION_PAPERS", deletedAt: null, isPublic: true },
      orderBy: { downloadCount: "desc" },
      take: 4,
    })

    let usedSimilarSubjects = false

    // 3. If NO PYQs are available locally, search for PYQs from SIMILAR subjects
    if (pyqResources.length === 0) {
      // Create search tokens from subject name (e.g., "Statistics and Data Analytics" -> "Statistics", "Data", "Analytics")
      const tokens = subject.name.split(/[\s,-]+/)
        .filter(t => t.length > 3 && !['and', 'with', 'for', 'the', 'fundamentals', 'advanced', 'introduction'].includes(t.toLowerCase()))
      
      if (tokens.length > 0) {
        // Find other subjects matching these keywords
        const similarSubjects = await prisma.subject.findMany({
          where: {
            id: { not: id },
            OR: tokens.map(token => ({ name: { contains: token, mode: "insensitive" } }))
          },
          select: { id: true, name: true }
        })

        const similarIds = similarSubjects.map(s => s.id)
        if (similarIds.length > 0) {
          pyqResources = await prisma.resource.findMany({
            where: {
               subjectId: { in: similarIds },
               resourceType: "QUESTION_PAPERS",
               deletedAt: null,
               isPublic: true
            },
            orderBy: { downloadCount: "desc" },
            take: 4
          })
          if (pyqResources.length > 0) usedSimilarSubjects = true
        }
      }
    }

    // 4. Extract text from the gathered PYQs (either local or similar)
    let pyqText = ""
    for (const pyq of pyqResources) {
      if (pyq.s3Key && isExtractable(pyq.mimeType, pyq.originalFilename)) {
        try {
          const response = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: pyq.s3Key }))
          const bodyBytes = await response.Body?.transformToByteArray()
          if (bodyBytes) {
            const buffer = Buffer.from(bodyBytes)
            const text = await extractTextFromBuffer(buffer, pyq.originalFilename)
            pyqText += `\n--- PYQ SOURCE: ${pyq.originalFilename} ---\n${text.slice(0, 2500)}\n`
          }
        } catch {}
      }
    }

    // 5. Ultimate physical fallback
    if (!syllabusText.trim() && !pyqText.trim()) {
      const allResources = await prisma.resource.findMany({
        where: { subjectId: id, deletedAt: null, isPublic: true },
        select: { originalFilename: true, resourceType: true, downloadCount: true },
        orderBy: { downloadCount: "desc" },
        take: 20,
      })
      syllabusText = `Available files (no text extracted):\n${allResources.map((r) => `- ${r.originalFilename} (${r.resourceType})`).join("\n")}`
    }

    const result = await callAI(
      `You are an exam pattern analyst. Your goal is to predict exam topics and questions based on the provided syllabus context and PYQs. 
      
      INSTRUCTIONS:
      1. Review the "Syllabus / Notes" (if any) to understand the core scope of the subject.
      2. Review the "Previous Year Questions (PYQs)" (if any). If the PYQs are from a similar subject, strictly filter and cross-reference those PYQs against the syllabus to ONLY provide questions that match the current subject's syllabus.
      3. Return ONLY a JSON object exactly matching this format:
{
  "very_likely": ["topic 1", "topic 2", ...],
  "likely": ["specific PYQ question 1", "specific PYQ question 2", ...],
  "possible": ["other potential question 1", "other potential question 2", ...]
}
      
      - "very_likely": Highlight 3-5 of the MOST IMPORTANT TOPICS based purely on traversing the syllabus sequentially.
      - "likely": Provide 3-4 EXACT FULL QUESTIONS verbatim from the uploaded PYQ papers that perfectly match the syllabus topics. Do not summarize them, write out the full PYQ question text.
      - "possible": Formulate 2-3 OTHER highly probable questions utilizing PYQ patterns that match the syllabus priorities.
      Keep predictions extremely concise. Do not use Markdown syntax.`,
      `Subject: ${subject.name} (${subject.code})
Semester: ${subject.semester?.number || "N/A"}
PYQs sourced from similar subjects instead of exactly this one?: ${usedSimilarSubjects ? 'Yes (cross-reference with syllabus carefully)' : 'No (exact match)'}

=== SYLLABUS / NOTES TEXT ===
${syllabusText.trim() ? syllabusText : 'No syllabus text available.'}

=== PREVIOUS YEAR QUESTIONS (PYQs) ===
${pyqText.trim() ? pyqText : 'No PYQ text available.'}

Based on the above, predict the most important topics and likely questions.`
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
