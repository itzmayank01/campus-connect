import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId: id } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 1: Check cache, unless ?refresh=true is provided
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true"
    
    if (!forceRefresh) {
      const cached = await prisma.subjectAiCache.findUnique({
        where: {
          subjectId_cacheType: {
            subjectId: id,
            cacheType: "syllabus_topics"
          }
        }
      })

      if (cached) {
        return NextResponse.json(cached.cacheData)
      }
    }

    // Step 2: Get syllabus resource
    let syllabus = await prisma.resource.findFirst({
      where: {
        subjectId: id,
        resourceType: "SYLLABUS",
        deletedAt: null,
        isPublic: true,
        s3Key: { not: null }
      },
      orderBy: { createdAt: "desc" }
    })

    if (!syllabus) {
      // Find ANY pdf that has 'syllabus', 'course', 'plan' in the name, OR just use the most popular PDF
      const possibleSyllabi = await prisma.resource.findMany({
        where: {
          subjectId: id,
          deletedAt: null,
          isPublic: true,
          s3Key: { not: null },
          // we prefer pdfs or generic files for text extraction
          mimeType: { contains: "pdf" }
        },
        orderBy: { downloadCount: "desc" },
        take: 5
      })
      
      const matchedSyllabus = possibleSyllabi.find(r => 
        r.originalFilename.toLowerCase().includes('syllabus') || 
        r.originalFilename.toLowerCase().includes('course') || 
        r.originalFilename.toLowerCase().includes('plan')
      )
      
      syllabus = matchedSyllabus || possibleSyllabi[0] || null
    }

    if (!syllabus) {
      return NextResponse.json({ 
        has_syllabus: false,
        error: "No syllabus or matching resources uploaded yet" 
      })
    }

    // Step 3: Extract text
    let syllabusText = ""
    try {
      const response = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: syllabus.s3Key! }))
      const bodyBytes = await response.Body?.transformToByteArray()
      if (bodyBytes) {
        const buffer = Buffer.from(bodyBytes)
        syllabusText = await extractTextFromBuffer(buffer, syllabus.originalFilename, syllabus.mimeType || undefined)
        // Extract up to 15000 chars to ensure long syllabi with many units are fully read
        syllabusText = syllabusText.slice(0, 15000)
      }
    } catch (err) {
      console.error("Syllabus extraction error:", err)
      return NextResponse.json({ 
        has_syllabus: true,
        error: "Could not read syllabus file content" 
      })
    }

    if (!isAiConfigured() || syllabusText.length < 50) {
      return NextResponse.json({ 
        has_syllabus: true,
        error: "Incomplete syllabus content or AI not configured" 
      })
    }

    // Step 4: Call AI
    const subject = await prisma.subject.findUnique({ where: { id } })

    const result = await callAI(
      `Extract the most important topics from this engineering course syllabus for ${subject?.name || 'this subject'}.
      
      Return ONLY valid JSON, no markdown:
      {
        "units": [
          {
            "unit_number": number,
            "unit_name": "string",
            "topics": ["topic 1", "topic 2", ...],
            "importance": "high" | "medium" | "low",
            "exam_weightage": "e.g. 20%"
          }
        ],
        "total_units": number,
        "most_important_overall": ["top topic 1", "top topic 2", ...],
        "course_objectives": ["objective 1", ...]
      }`,
      `Syllabus content:
      ${syllabusText}`
    )

    if (!result) throw new Error("AI returned nothing")

    const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
    const topicsData = JSON.parse(cleaned)

    // Step 5: Cache the result
    const finalData = { ...topicsData, has_syllabus: true }
    await prisma.subjectAiCache.upsert({
      where: {
        subjectId_cacheType: {
          subjectId: id,
          cacheType: "syllabus_topics"
        }
      },
      create: {
        subjectId: id,
        cacheType: "syllabus_topics",
        cacheData: finalData
      },
      update: {
        cacheData: finalData,
        createdAt: new Date()
      }
    })

    return NextResponse.json(finalData)

  } catch (error: any) {
    console.error("Syllabus topics error:", error)
    return NextResponse.json({ error: "Failed to extract topics", success: false }, { status: 200 })
  }
}
