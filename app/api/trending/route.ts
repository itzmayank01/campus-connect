import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTrendingResources } from "@/lib/intelligence/contextual-signals"
import { prisma } from "@/lib/prisma"

// GET /api/trending?period=24h|7d&subject=xxx&limit=20
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)
    const subjectId = request.nextUrl.searchParams.get("subject") || undefined

    const trending = await getTrendingResources(limit, subjectId)

    // Enrich with subject and uploader data
    const resourceIds = trending.map((r) => r.id)
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

    const enriched = resources.map((resource) => {
      const trendData = trending.find((t) => t.id === resource.id)
      return {
        id: resource.id,
        filename: resource.originalFilename,
        subject: resource.subject,
        resourceType: resource.resourceType,
        downloadCount: resource.downloadCount,
        likeCount: resource.likeCount,
        qualityScore: resource.qualityScore,
        trendingScore: trendData?.trendingScore || 0,
        uploader: {
          name: resource.uploader.name || resource.uploader.email.split("@")[0],
          image: resource.uploader.image,
          reputationLevel: resource.uploader.reputation?.reputationLevel || "Newcomer",
        },
        createdAt: resource.createdAt,
      }
    })

    // Sort by trending score descending
    enriched.sort((a, b) => b.trendingScore - a.trendingScore)

    return NextResponse.json({ trending: enriched })
  } catch (error: any) {
    console.error("Trending error:", error)
    return NextResponse.json(
      { error: "Failed to fetch trending", details: error.message },
      { status: 500 }
    )
  }
}
