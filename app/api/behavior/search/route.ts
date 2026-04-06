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

    // Track search interaction via UserBehaviorProfile (upsert — fast, no heavy queries)
    await prisma.userBehaviorProfile.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        totalInteractions: 1,
        preferredSubjects: body.subjectCode ? [body.subjectCode] : [],
        lastProfileUpdate: new Date(),
      },
      update: {
        totalInteractions: { increment: 1 },
        lastProfileUpdate: new Date(),
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
