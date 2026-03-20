import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/behavior/search — track search event (fire-and-forget from client)
// This is lightweight: just inserts a row. No heavy queries.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = await request.json()
    const query = (body.query || "").toLowerCase().trim()

    if (!query) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    // Insert search event — fast single INSERT, no complex queries
    await prisma.userBehaviorEvent.create({
      data: {
        userId: dbUser.id,
        eventType: "search",
        searchQuery: query,
        subjectId: body.subjectId || null,
        subjectCode: body.subjectCode || null,
      },
    })

    // Return immediately — NO repeat search detection here
    // Repeat search logic belongs in the Smart Feed API, not in the search tracker
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("Search tracking error:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
