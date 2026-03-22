import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

function generateFallbackSummary(resource: any) {
  return {
    bullets: [
      `${resource.resourceType || 'Educational content'} for ${resource.subject?.name || 'this subject'}`,
      `Uploaded as ${resource.originalFilename}`,
      `Download to view the full content`
    ],
    topics: resource.tags || [],
    examTopics: [],
    readTime: null,
    difficulty: null,
    fallback: true
  }
}

// GET /api/resources/[id]/ai-summary — generate AI summary (no caching for now)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let resource: any = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 1: Get resource from DB
    resource = await prisma.resource.findUnique({
      where: { id },
      include: { subject: true },
    })

    if (!resource) {
      return NextResponse.json({ error: "Resource not found", success: false }, { status: 200 })
    }

    // Step 2: Check SubjectAiCache for a cached summary
    let cached: any = null
    try {
      cached = await prisma.subjectAiCache.findFirst({
        where: {
          subjectId: resource.subjectId,
          cacheType: `resource_summary_${id}`,
        },
      })
    } catch {
      // Cache table might not have data yet — continue without cache
    }

    if (cached?.cacheData) {
      const data = cached.cacheData as any
      if (data.summary_bullets?.length > 0) {
        return NextResponse.json({
          bullets: data.summary_bullets,
          topics: data.key_topics || [],
          examTopics: data.likely_exam_topics || [],
          readTime: data.estimated_read_minutes || null,
          difficulty: data.difficulty_level || null,
          success: true,
          cached: true,
        })
      }
    }

    // Step 3: Handle AI extraction & call
    if (!isAiConfigured()) {
       return NextResponse.json({
         ...generateFallbackSummary(resource),
         success: true,
         error: "AI service not configured"
       })
    }

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
          extractedText = await extractTextFromBuffer(buffer, resource.originalFilename, resource.mimeType || undefined)
          // Limit length for summary
          extractedText = extractedText.slice(0, 4000)
        }
      } catch (err) {
        console.error("Extraction error:", err)
        extractedText = resource.originalFilename
      }
    } else if (resource.mimeType === "youtube" || resource.youtubeTitle) {
      extractedText = `${resource.youtubeTitle || ''} by ${resource.youtubeChannel || ''}`
    } else {
      extractedText = resource.originalFilename
    }

    // Step 4: Call AI
    const result = await callAI(
      `You are an academic content analyst. Analyze the study material and return ONLY a valid JSON object.
      
      INSTRUCTIONS for summary_bullets:
      - Make the summary extremely crisp, short, and highly relevant.
      - Do NOT write huge theory blocks or lengthy paragraphs.
      - Keep each point strictly to a single, impactful sentence about the most vital concepts.

      Return ONLY valid JSON, no markdown:
      {
        "summary_bullets": ["bullet point 1", "bullet point 2", ...],
        "key_topics": ["topic1", "topic2", ...],
        "likely_exam_topics": ["exam question topic 1", ...],
        "estimated_read_minutes": number,
        "difficulty_level": "Beginner" | "Intermediate" | "Advanced"
      }`,
      `Subject: ${resource.subject?.name || "Unknown"} (${resource.subject?.code || "N/A"})
      Filename: ${resource.originalFilename}
      
      Content snippet:
      ${extractedText || 'No text extracted.'}`
    )

    if (!result) {
       return NextResponse.json({
         ...generateFallbackSummary(resource),
         success: true,
         error: "AI generation failed"
       })
    }

    try {
      const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
      const parsed = JSON.parse(cleaned)

      // Step 5: Cache the result using SubjectAiCache
      try {
        await prisma.subjectAiCache.upsert({
          where: {
            subjectId_cacheType: {
              subjectId: resource.subjectId,
              cacheType: `resource_summary_${id}`,
            },
          },
          create: {
            subjectId: resource.subjectId,
            cacheType: `resource_summary_${id}`,
            cacheData: parsed,
          },
          update: {
            cacheData: parsed,
          },
        })
      } catch {
        // Caching failed — not critical, continue
      }

      return NextResponse.json({
        bullets: parsed.summary_bullets || [],
        topics: parsed.key_topics || [],
        examTopics: parsed.likely_exam_topics || [],
        readTime: parsed.estimated_read_minutes || null,
        difficulty: parsed.difficulty_level || null,
        success: true,
        cached: false,
      })
    } catch {
       return NextResponse.json({
         ...generateFallbackSummary(resource),
         success: true,
         error: "Failed to parse AI response"
       })
    }
  } catch (error: unknown) {
    console.error("AI summary main failure:", error)
    if (resource) {
       return NextResponse.json({
         ...generateFallbackSummary(resource),
         success: false
       })
    }
    return NextResponse.json({ 
      error: "Critical failure", 
      bullets: ["Service temporarily unavailable"], 
      topics: [], 
      examTopics: [] 
    }, { status: 200 })
  }
}
