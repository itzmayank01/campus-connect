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

    // Get all ratings on this faculty's resources
    const ratings = await prisma.resourceRating.findMany({
      where: { resource: { uploaderId: dbUser.id, deletedAt: null } },
      select: {
        id: true,
        rating: true,
        createdAt: true,
        user: { select: { name: true } },
        resource: { select: { originalFilename: true } },
        replies: { select: { reply: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const totalRatings = ratings.length
    const averageRating = totalRatings > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / totalRatings
      : 0

    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratings.forEach((r) => {
      ratingBreakdown[r.rating] = (ratingBreakdown[r.rating] || 0) + 1
    })

    return NextResponse.json({
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings,
      ratingBreakdown,
      feedback: ratings.map((r) => ({
        id: r.id,
        rating: r.rating,
        resourceName: r.resource.originalFilename,
        studentName: r.user.name || "Anonymous Student",
        createdAt: r.createdAt.toISOString(),
        reply: r.replies[0]?.reply || null,
      })),
    })
  } catch (err) {
    console.error("Faculty feedback error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
