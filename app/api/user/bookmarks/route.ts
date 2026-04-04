import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/user/bookmarks — fetch current user's bookmarked resources
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ bookmarks: [] })
    }

    const bookmarks = await prisma.resourceBookmark.findMany({
      where: { userId: dbUser.id },
      include: {
        resource: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            uploader: { select: { id: true, name: true, email: true, image: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const resources = bookmarks.map((b) => ({
      bookmarkId: b.id,
      bookmarkedAt: b.createdAt,
      ...b.resource,
    }))

    return NextResponse.json({ bookmarks: resources })
  } catch (error: unknown) {
    console.error("Fetch bookmarks error:", error)
    return NextResponse.json({ bookmarks: [] })
  }
}
