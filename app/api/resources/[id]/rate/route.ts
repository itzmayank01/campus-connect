import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

function computeTrendingScore(resource: { likeCount: number; downloadCount: number; averageRating: number; createdAt: Date }) {
  const daysSinceUpload = Math.max(0, (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const recencyBoost = Math.max(0, 10 - daysSinceUpload)
  return (resource.likeCount * 3) + (resource.downloadCount * 1) + (resource.averageRating * 2) + recencyBoost
}

async function findOrCreateUser(supabaseUser: { id: string; email?: string; user_metadata?: any }) {
  let dbUser = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0],
      },
    })
  }
  return dbUser
}

// POST /api/resources/[id]/rate — submit or update a 1-5 star rating
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const rating = Math.min(5, Math.max(1, Math.round(body.rating)))

    // Verify resource exists
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

    const dbUser = await findOrCreateUser(user)

    // Upsert the rating
    await prisma.resourceRating.upsert({
      where: { resourceId_userId: { resourceId: id, userId: dbUser.id } },
      create: { resourceId: id, userId: dbUser.id, rating },
      update: { rating },
    })

    // Recalculate average rating from all ratings
    const agg = await prisma.resourceRating.aggregate({
      where: { resourceId: id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    const avgRating = Math.round((agg._avg.rating || 0) * 10) / 10
    const ratingCount = agg._count.rating || 0

    const updated = await prisma.resource.update({
      where: { id },
      data: { averageRating: avgRating, ratingCount },
    })

    // Recompute trending score
    await prisma.resource.update({
      where: { id },
      data: { trendingScore: computeTrendingScore(updated) },
    })

    return NextResponse.json({
      averageRating: avgRating,
      ratingCount,
      userRating: rating,
    })
  } catch (error: unknown) {
    console.error("Rating error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to save rating", details: message }, { status: 500 })
  }
}

// GET /api/resources/[id]/rate — get current user's rating + average
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ averageRating: 0, ratingCount: 0, userRating: 0 })

    const { id } = await params
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })

    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { averageRating: true, ratingCount: true },
    })

    let userRating = 0
    if (dbUser) {
      const existing = await prisma.resourceRating.findUnique({
        where: { resourceId_userId: { resourceId: id, userId: dbUser.id } },
      })
      userRating = existing?.rating || 0
    }

    return NextResponse.json({
      averageRating: resource?.averageRating || 0,
      ratingCount: resource?.ratingCount || 0,
      userRating,
    })
  } catch (error: unknown) {
    console.error("Rating check error:", error)
    return NextResponse.json({ averageRating: 0, ratingCount: 0, userRating: 0 })
  }
}
