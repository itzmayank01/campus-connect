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

// POST /api/resources/[id]/like — toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Verify resource exists
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

    const dbUser = await findOrCreateUser(user)

    // Check if already liked
    const existing = await prisma.resourceLike.findUnique({
      where: { resourceId_likedByUserId: { resourceId: id, likedByUserId: dbUser.id } },
    })

    if (existing) {
      // Unlike
      await prisma.resourceLike.delete({ where: { id: existing.id } })
      const updated = await prisma.resource.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      })
      // Recompute trending score
      await prisma.resource.update({
        where: { id },
        data: { trendingScore: computeTrendingScore(updated) },
      })
      return NextResponse.json({ liked: false, likeCount: updated.likeCount })
    } else {
      // Like
      await prisma.resourceLike.create({
        data: { resourceId: id, likedByUserId: dbUser.id },
      })
      const updated = await prisma.resource.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      })
      await prisma.resource.update({
        where: { id },
        data: { trendingScore: computeTrendingScore(updated) },
      })
      return NextResponse.json({ liked: true, likeCount: updated.likeCount })
    }
  } catch (error: unknown) {
    console.error("Like error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to toggle like", details: message }, { status: 500 })
  }
}

// GET /api/resources/[id]/like — check if current user liked this resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ liked: false, likeCount: 0 })

    const { id } = await params
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ liked: false, likeCount: 0 })

    const existing = await prisma.resourceLike.findUnique({
      where: { resourceId_likedByUserId: { resourceId: id, likedByUserId: dbUser.id } },
    })
    const resource = await prisma.resource.findUnique({ where: { id }, select: { likeCount: true } })

    return NextResponse.json({ liked: !!existing, likeCount: resource?.likeCount || 0 })
  } catch (error: unknown) {
    console.error("Like check error:", error)
    return NextResponse.json({ liked: false, likeCount: 0 })
  }
}
