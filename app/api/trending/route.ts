import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/trending?limit=5 — top resources sorted by likes + downloads
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10)

    // Get top resources sorted by trendingScore (computed from likes + downloads + rating)
    const resources = await prisma.resource.findMany({
      where: { isPublic: true, deletedAt: null },
      orderBy: [
        { trendingScore: "desc" },
        { likeCount: "desc" },
        { downloadCount: "desc" },
      ],
      take: limit,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploader: {
          select: {
            id: true, name: true, email: true, image: true,
            reputation: { select: { reputationLevel: true } },
          },
        },
      },
    })

    const enriched = resources.map((resource) => ({
      id: resource.id,
      filename: resource.originalFilename,
      subject: resource.subject,
      resourceType: resource.resourceType,
      downloadCount: resource.downloadCount,
      likeCount: resource.likeCount,
      averageRating: resource.averageRating,
      ratingCount: resource.ratingCount,
      qualityScore: resource.qualityScore,
      trendingScore: resource.trendingScore,
      isYoutube: resource.mimeType === "youtube",
      youtubeThumbnail: resource.youtubeThumbnail,
      youtubeTitle: resource.youtubeTitle,
      uploader: {
        name: resource.uploader.name || resource.uploader.email.split("@")[0],
        image: resource.uploader.image,
        reputationLevel: resource.uploader.reputation?.reputationLevel || "Newcomer",
      },
      createdAt: resource.createdAt,
    }))

    return NextResponse.json({ trending: enriched })
  } catch (error: unknown) {
    console.error("Trending error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch trending", details: message },
      { status: 500 }
    )
  }
}
