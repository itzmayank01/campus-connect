import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// In-memory cache per semester
const cache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_TTL_MS = 60_000 // 60 seconds

// GET /api/semesters/[semesterId]/subjects — all subjects with resource counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ semesterId: string }> }
) {
  try {
    const { semesterId } = await params

    // Check cache first
    const now = Date.now()
    const cached = cache[semesterId]
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Cache": "HIT",
        },
      })
    }

    // Try to find by ID first, then by semester number
    let semester = await prisma.semester.findUnique({
      where: { id: semesterId },
    })

    if (!semester) {
      const semNumber = parseInt(semesterId)
      if (!isNaN(semNumber)) {
        semester = await prisma.semester.findUnique({
          where: { number: semNumber },
        })
      }
    }

    if (!semester) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 })
    }

    // Single query: get all subjects with their resource counts
    const subjects = await prisma.subject.findMany({
      where: { semesterId: semester.id },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            notes: true,
            resources: true,
          },
        },
        resources: {
          where: { isPublic: true, deletedAt: null },
          select: {
            resourceType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    // Process counts from the already-fetched resources (no extra queries)
    const subjectsWithCounts = subjects.map((subject: any) => {
      const resources = subject.resources || []
      const typeCounts: Record<string, number> = {}
      for (const r of resources) {
        typeCounts[r.resourceType] = (typeCounts[r.resourceType] || 0) + 1
      }

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        credits: subject.credits,
        category: subject.category,
        isLab: subject.isLab,
        totalResources: (subject._count?.notes || 0) + (subject._count?.resources || 0),
        notesCount: typeCounts["NOTES"] || 0,
        questionPapersCount: typeCounts["QUESTION_PAPERS"] || 0,
        videosCount: typeCounts["VIDEOS"] || 0,
        referenceCount: typeCounts["REFERENCE"] || 0,
        lastUpload: resources.length > 0 ? resources[0].createdAt : null,
      }
    })

    const responseData = {
      semester,
      subjects: subjectsWithCounts,
      totalSubjects: subjects.length,
      totalResources: subjectsWithCounts.reduce((acc: number, s: { totalResources: number }) => acc + s.totalResources, 0),
    }

    // Update cache
    cache[semesterId] = { data: responseData, timestamp: now }

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    })
  } catch (error: unknown) {
    console.error("Semester subjects error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch semester subjects", details: message },
      { status: 500 }
    )
  }
}
