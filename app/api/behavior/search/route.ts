import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/behavior/search — track search event + detect repeat searches
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const query = (body.query || "").toLowerCase().trim()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Insert search event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: dbUser.id,
        eventType: "search",
        searchQuery: query,
        subjectId: body.subjectId || null,
        subjectCode: body.subjectCode || null,
      },
    })

    // Check for repeat searches in last 7 days using raw SQL for ILIKE substring matching
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const repeatResults = await prisma.$queryRaw<
      Array<{ search_query: string; search_count: bigint }>
    >`
      SELECT search_query, COUNT(*) as search_count
      FROM user_behavior_events
      WHERE user_id = ${dbUser.id}
        AND event_type = 'search'
        AND (
          search_query ILIKE '%' || ${query} || '%'
          OR ${query} ILIKE '%' || search_query || '%'
        )
        AND created_at > ${sevenDaysAgo}
      GROUP BY search_query
      HAVING COUNT(*) >= 2
    `

    const totalCount = repeatResults.reduce(
      (sum, row) => sum + Number(row.search_count),
      0
    )

    const repeated = totalCount >= 2

    return NextResponse.json({
      repeated,
      count: totalCount,
      query,
      matchedQueries: repeatResults.map((r) => r.search_query),
    })
  } catch (error: unknown) {
    console.error("Search tracking error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to track search", details: message },
      { status: 500 }
    )
  }
}
