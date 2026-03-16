import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getPersonalizedRecommendations, updateBehaviorProfile } from "@/lib/intelligence/recommendation-engine"

// GET /api/recommendations?limit=20
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ recommendations: [], message: "No user profile found" })
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)

    // Get personalized recommendations
    const recommendations = await getPersonalizedRecommendations(dbUser.id, limit)

    // Enrich with full resource data
    const resourceIds = recommendations.map((r) => r.resourceId)
    const resources = await prisma.resource.findMany({
      where: { id: { in: resourceIds } },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploader: {
          select: {
            id: true, name: true, email: true, image: true,
            reputation: { select: { reputationLevel: true, trustScore: true } },
          },
        },
      },
    })

    const resourceMap = new Map(resources.map((r) => [r.id, r]))

    const enriched = recommendations
      .map((rec) => {
        const resource = resourceMap.get(rec.resourceId)
        if (!resource) return null
        return {
          ...rec,
          resource: {
            id: resource.id,
            filename: resource.originalFilename,
            subject: resource.subject,
            resourceType: resource.resourceType,
            downloadCount: resource.downloadCount,
            likeCount: resource.likeCount,
            qualityScore: resource.qualityScore,
            trendingScore: resource.trendingScore,
            uploader: {
              name: resource.uploader.name || resource.uploader.email.split("@")[0],
              image: resource.uploader.image,
              reputationLevel: resource.uploader.reputation?.reputationLevel || "Newcomer",
            },
            createdAt: resource.createdAt,
          },
        }
      })
      .filter(Boolean)

    // Update behavior profile in the background (fire and forget)
    updateBehaviorProfile(dbUser.id).catch(console.error)

    return NextResponse.json({ recommendations: enriched })
  } catch (error: any) {
    console.error("Recommendations error:", error)
    return NextResponse.json(
      { error: "Failed to fetch recommendations", details: error.message },
      { status: 500 }
    )
  }
}
