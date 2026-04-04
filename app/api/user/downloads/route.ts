import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/user/downloads — fetch current user's downloaded resources
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ downloads: [] })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    const downloads = await prisma.resourceDownload.findMany({
      where: { userId: dbUser.id },
      include: {
        resource: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            uploader: { select: { id: true, name: true, email: true, image: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { downloadedAt: "desc" },
      take: limit,
    })

    // De-duplicate: keep only the latest download per resource
    const seen = new Set<string>()
    const uniqueDownloads = downloads.filter((d) => {
      if (seen.has(d.resourceId)) return false
      seen.add(d.resourceId)
      return true
    })

    const resources = uniqueDownloads.map((d) => ({
      downloadId: d.id,
      downloadedAt: d.downloadedAt,
      ...d.resource,
    }))

    return NextResponse.json({ downloads: resources })
  } catch (error: unknown) {
    console.error("Fetch downloads error:", error)
    return NextResponse.json({ downloads: [] })
  }
}
