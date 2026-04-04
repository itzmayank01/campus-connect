import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/user/bookmarks/check — check which resources are bookmarked
// Body: { resourceIds: string[] }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ bookmarkedIds: [] })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ bookmarkedIds: [] })
    }

    const body = await request.json()
    const resourceIds: string[] = body.resourceIds || []

    if (resourceIds.length === 0) {
      return NextResponse.json({ bookmarkedIds: [] })
    }

    const bookmarks = await prisma.resourceBookmark.findMany({
      where: {
        userId: dbUser.id,
        resourceId: { in: resourceIds },
      },
      select: { resourceId: true },
    })

    return NextResponse.json({
      bookmarkedIds: bookmarks.map((b) => b.resourceId),
    })
  } catch {
    return NextResponse.json({ bookmarkedIds: [] })
  }
}
