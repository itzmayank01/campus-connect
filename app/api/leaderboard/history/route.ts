import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/leaderboard/history?week=2026-03-07
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const weekParam = request.nextUrl.searchParams.get("week")

    // If no week param, get the most recent history entry
    const history = await (prisma as any).leaderboardHistory?.findFirst({
      where: weekParam
        ? { weekStart: new Date(weekParam) }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        rank1User: { select: { id: true, name: true, email: true, image: true } },
        rank2User: { select: { id: true, name: true, email: true, image: true } },
        rank3User: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    if (!history) {
      return NextResponse.json({ history: null })
    }

    return NextResponse.json({ history })
  } catch (error: unknown) {
    // If the model doesn't exist yet, return null gracefully
    console.error("Leaderboard history error:", error)
    return NextResponse.json({ history: null })
  }
}
