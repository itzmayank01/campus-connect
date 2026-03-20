import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

function getDefaultPredictions(subject: any) {
  return {
    high_probability: [
      { topic: "Core theoretical concepts", reason: "Typically high weightage" },
      { topic: "Problem solving applications", reason: "Common in engineering exams" }
    ],
    medium_probability: [
      { topic: "Numerical problems", reason: "Standard exam pattern" }
    ],
    low_probability: [],
    based_on: "general exam patterns",
    disclaimer: true,
    is_default: true
  }
}

// GET /api/subjects/[subjectId]/exam-predictor — predict exam questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId: id } = await params
  let subject: any = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 1: Check cache first (weekly TTL)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const cached = await prisma.subjectAiCache.findUnique({
      where: {
        subjectId_cacheType: {
          subjectId: id,
          cacheType: "exam_predictor"
        }
      }
    })

    if (cached && (cached.createdAt > oneWeekAgo)) {
      return NextResponse.json(cached.cacheData)
    }

    // Step 2: Get subject details
    subject = await prisma.subject.findUnique({
      where: { id },
      include: { semester: true }
    })

    if (!subject) {
      return NextResponse.json(getDefaultPredictions(null), { status: 200 })
    }

    // Step 3: Handle AI
    if (!isAiConfigured()) {
      return NextResponse.json(getDefaultPredictions(subject))
    }

    // Gather context (PYQs and Syllabus)
    const pyqs = await prisma.resource.findMany({
      where: {
        subjectId: id,
        resourceType: { in: ["QUESTION_PAPERS", "SYLLABUS"] },
        deletedAt: null,
        isPublic: true,
        s3Key: { not: null }
      },
      orderBy: { createdAt: "desc" },
      take: 4
    })

    let pyqText = ""
    for (const pyq of pyqs) {
      try {
        const response = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: pyq.s3Key! }))
        const bodyBytes = await response.Body?.transformToByteArray()
        if (bodyBytes) {
          const buffer = Buffer.from(bodyBytes)
          const text = await extractTextFromBuffer(buffer, pyq.originalFilename, pyq.mimeType || undefined)
          pyqText += `\n--- SOURCE: ${pyq.originalFilename} ---\n${text.slice(0, 2000)}\n`
        }
      } catch (err) {
        pyqText += `\nFile available: ${pyq.originalFilename}\n`
      }
    }

    // Step 4: Call AI
    const result = await callAI(
      `You are an exam prediction expert for engineering students.
      Analyze the provided subject context and past papers to predict likely exam topics.
      
      Return ONLY valid JSON, no markdown:
      {
        "high_probability": [
          {"topic": "topic name", "reason": "one sentence reason"}
        ],
        "medium_probability": [
          {"topic": "topic name", "reason": "reason"}
        ],
        "low_probability": [
          {"topic": "topic name", "reason": "reason"}
        ],
        "based_on": "e.g. 2 past papers or subject syllabus",
        "disclaimer": true
      }`,
      `Subject: ${subject.name} (${subject.code})
      Semester: ${subject.semester?.number || "N/A"}
      
      Context data:
      ${pyqText || 'No specific previous year papers uploaded yet. Generate predictions based on typical core engineering coursework for this subject.'}`
    )

    if (!result) throw new Error("AI returned no result")

    const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
    const predictions = JSON.parse(cleaned)

    // Step 5: Cache the result
    await prisma.subjectAiCache.upsert({
      where: {
        subjectId_cacheType: {
          subjectId: id,
          cacheType: "exam_predictor"
        }
      },
      create: {
        subjectId: id,
        cacheType: "exam_predictor",
        cacheData: predictions
      },
      update: {
        cacheData: predictions,
        createdAt: new Date()
      }
    })

    return NextResponse.json(predictions)

  } catch (error: any) {
    console.error("Exam predictor error:", error)
    return NextResponse.json(getDefaultPredictions(subject), { status: 200 })
  }
}
