import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { batchRecomputeScores, computeQualityScore, computeTrendingScore, recomputeUploaderReputation } from "@/lib/intelligence/quality-scorer"
import { cacheDel, CacheKeys } from "@/lib/redis"

// POST /api/quality-score/recompute — Batch recompute or single resource
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { resourceId, mode = "single" } = body

    if (mode === "batch") {
      // Batch recompute all resources — admin or cron trigger
      const result = await batchRecomputeScores()

      // Invalidate trending cache
      await cacheDel(CacheKeys.trendingGlobal())

      return NextResponse.json({
        message: "Batch recompute complete",
        ...result,
      })
    }

    if (!resourceId) {
      return NextResponse.json(
        { error: "Missing resourceId for single recompute" },
        { status: 400 }
      )
    }

    // Single resource recompute
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        averageRating: true,
        ratingCount: true,
        downloadCount: true,
        likeCount: true,
        bookmarkCount: true,
        createdAt: true,
        uploaderId: true,
      },
    })

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    const { qualityScore, breakdown } = await computeQualityScore({
      averageRating: resource.averageRating,
      ratingCount: resource.ratingCount,
      downloadCount: resource.downloadCount,
      likeCount: resource.likeCount,
      bookmarkCount: resource.bookmarkCount,
      createdAt: resource.createdAt,
      uploaderId: resource.uploaderId,
    })

    const trendingScore = await computeTrendingScore(
      resource.id,
      resource.downloadCount,
      resource.likeCount
    )

    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        qualityScore,
        trendingScore,
        lastScoredAt: new Date(),
      },
    })

    // Recompute uploader reputation
    await recomputeUploaderReputation(resource.uploaderId)

    // Invalidate relevant caches
    await cacheDel(CacheKeys.qualityScore(resourceId))
    await cacheDel(CacheKeys.trendingGlobal())

    return NextResponse.json({
      resourceId,
      qualityScore,
      trendingScore,
      breakdown,
    })
  } catch (error: unknown) {
    console.error("Quality score recompute error:", error)
    return NextResponse.json(
      { error: "Failed to recompute quality score" },
      { status: 500 }
    )
  }
}
