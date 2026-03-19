import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "all"

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id

    // Get current user's db id
    let currentDbUserId: string | null = null
    if (currentUserId) {
      const cu = await prisma.user.findUnique({
        where: { supabaseId: currentUserId },
        select: { id: true },
      })
      currentDbUserId = cu?.id || null
    }

    // Get all faculty users with their stats
    const facultyUsers = await prisma.user.findMany({
      where: { role: "FACULTY" },
      select: {
        id: true,
        name: true,
        department: true,
        impactScore: true,
        facultyRank: true,
        resources: {
          where: { deletedAt: null },
          select: { downloadCount: true, likeCount: true, averageRating: true, ratingCount: true },
        },
      },
      orderBy: { impactScore: "desc" },
      take: 15,
    })

    return NextResponse.json({
      faculty: facultyUsers.map((f) => ({
        id: f.id,
        name: f.name || "Anonymous Faculty",
        department: f.department || "Faculty",
        totalDownloads: f.resources.reduce((s, r) => s + r.downloadCount, 0),
        totalLikes: f.resources.reduce((s, r) => s + r.likeCount, 0),
        averageRating: f.resources.length > 0
          ? Number((f.resources.reduce((s, r) => s + r.averageRating, 0) / f.resources.length).toFixed(1))
          : 0,
        totalUploads: f.resources.length,
        impactScore: f.impactScore,
        facultyRank: f.facultyRank,
        isCurrentUser: f.id === currentDbUserId,
      })),
    })
  } catch (err) {
    console.error("Faculty leaderboard error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
