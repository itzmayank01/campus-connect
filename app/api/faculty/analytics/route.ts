import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Subject breakdown
    const resources = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id, deletedAt: null },
      select: { subject: { select: { name: true } }, downloadCount: true, likeCount: true, averageRating: true, originalFilename: true },
    })

    const subjectMap: Record<string, number> = {}
    resources.forEach((r) => {
      subjectMap[r.subject.name] = (subjectMap[r.subject.name] || 0) + 1
    })

    const topMaterials = [...resources]
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 5)
      .map((r) => ({
        name: r.originalFilename,
        downloads: r.downloadCount,
        likes: r.likeCount,
        rating: r.averageRating,
      }))

    return NextResponse.json({
      weeklyDownloads: [],
      weeklyLikes: [],
      subjectBreakdown: Object.entries(subjectMap).map(([name, count], i) => ({
        name,
        count,
        color: ["#22C55E", "#4F8EF7", "#F59E0B", "#EF4444", "#8B5CF6"][i % 5],
      })),
      topMaterials,
    })
  } catch (err) {
    console.error("Faculty analytics error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
