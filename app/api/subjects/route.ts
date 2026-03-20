import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// In-memory cache for subjects (avoids DB hit on every request)
let cachedSubjects: any[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

// GET /api/subjects — list all subjects with resource counts
export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if fresh
    if (cachedSubjects && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedSubjects, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Cache": "HIT",
        },
      })
    }

    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        semester: true,
        _count: {
          select: {
            notes: true,
            resources: true,
          },
        },
      },
    })

    const formattedSubjects = subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      semesterId: s.semesterId,
      semesterNumber: s.semester?.number,
      credits: s.credits,
      category: s.category,
      resourceCount: (s._count?.notes || 0) + (s._count?.resources || 0),
    }))

    // Update cache
    cachedSubjects = formattedSubjects
    cacheTimestamp = now

    return NextResponse.json(formattedSubjects, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch subjects", details: message },
      { status: 500 }
    )
  }
}

