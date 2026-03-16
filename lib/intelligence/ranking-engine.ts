/**
 * Ranking Engine — Multi-Signal Composite Ranking
 *
 * Powers:
 *   - Resource ranking in study materials & search
 *   - Enhanced leaderboard with reputation weighting
 *   - Diversity-aware result ordering
 */

import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from "@/lib/redis"

// ─── Resource Ranking ───

interface RankableResource {
  id: string
  qualityScore: number
  trendingScore: number
  downloadCount: number
  likeCount: number
  uploaderId: string
  subjectId: string
  resourceType: string
  createdAt: Date
}

interface RankingContext {
  subjectId?: string      // boost relevance for this subject
  semester?: number       // boost relevance for this semester
  resourceType?: string   // boost matching type
  searchQuery?: string    // text relevance (future)
}

const RANKING_WEIGHTS = {
  quality: 0.40,
  relevance: 0.30,
  velocity: 0.15,
  diversity: 0.15,
}

export function computeRelevanceScore(
  resource: RankableResource,
  context: RankingContext
): number {
  let score = 0.5 // base relevance

  if (context.subjectId && resource.subjectId === context.subjectId) {
    score += 0.3
  }

  if (context.resourceType && resource.resourceType === context.resourceType) {
    score += 0.2
  }

  return Math.min(1, score)
}

/**
 * Rank resources with multi-signal composite scoring + diversity penalty.
 */
export function rankResources(
  resources: RankableResource[],
  context: RankingContext = {}
): RankableResource[] {
  // Find max trending for normalization
  const maxTrending = Math.max(...resources.map((r) => r.trendingScore), 0.001)

  // Compute raw scores
  const scored = resources.map((resource) => {
    const quality = resource.qualityScore
    const relevance = computeRelevanceScore(resource, context)
    const velocity = resource.trendingScore / maxTrending
    // Diversity bonus is applied in the reranking step
    const rawScore =
      RANKING_WEIGHTS.quality * quality +
      RANKING_WEIGHTS.relevance * relevance +
      RANKING_WEIGHTS.velocity * velocity

    return { resource, rawScore, quality, relevance, velocity }
  })

  // Sort by raw score first
  scored.sort((a, b) => b.rawScore - a.rawScore)

  // Diversity reranking: Penalize consecutive results from the same uploader
  const reranked: typeof scored = []
  const uploaderRecentCount = new Map<string, number>()

  for (const item of scored) {
    const recentCount = uploaderRecentCount.get(item.resource.uploaderId) || 0
    const diversityPenalty = recentCount * 0.1 // Each repeat from same uploader reduces score by 0.1
    const finalScore = item.rawScore * (1 - diversityPenalty * RANKING_WEIGHTS.diversity)

    reranked.push({ ...item, rawScore: finalScore })
    uploaderRecentCount.set(item.resource.uploaderId, recentCount + 1)
  }

  // Re-sort after diversity penalty
  reranked.sort((a, b) => b.rawScore - a.rawScore)

  return reranked.map((r) => r.resource)
}

// ─── Enhanced Leaderboard Ranking ───

interface UploaderRankData {
  userId: string
  name: string
  email: string
  image: string | null
  supabaseId: string | null
  flameScore: number
  currentStreak: number
  flameLevel: string
  trustScore: number
  avgResourceQuality: number
  reputationLevel: string
  totalUploads: number
  totalDownloadsReceived: number
  totalLikesReceived: number
}

const LEADERBOARD_WEIGHTS = {
  flame: 0.30,
  trust: 0.25,
  impact: 0.25,
  consistency: 0.20,
}

export function computeUploaderRank(uploader: UploaderRankData): number {
  // Normalize flame score (assume max ~5000 for top user)
  const flameFactor = Math.log(1 + uploader.flameScore) / (Math.log(1 + uploader.flameScore) + 5)

  // Trust is already 0-1
  const trustFactor = uploader.trustScore

  // Content impact: total downstream engagement
  const totalImpact = uploader.totalDownloadsReceived + uploader.totalLikesReceived * 2
  const impactFactor = Math.log(1 + totalImpact) / (Math.log(1 + totalImpact) + 5)

  // Consistency: streak × upload regularity
  const streakFactor = Math.log(1 + uploader.currentStreak) / (Math.log(1 + uploader.currentStreak) + 3)
  const volumeFactor = Math.log(1 + uploader.totalUploads) / (Math.log(1 + uploader.totalUploads) + 3)
  const consistencyFactor = (streakFactor + volumeFactor) / 2

  const rank =
    LEADERBOARD_WEIGHTS.flame * flameFactor +
    LEADERBOARD_WEIGHTS.trust * trustFactor +
    LEADERBOARD_WEIGHTS.impact * impactFactor +
    LEADERBOARD_WEIGHTS.consistency * consistencyFactor

  return Math.round(rank * 10000) / 10000
}

/**
 * Get reputation-weighted leaderboard with caching.
 */
export async function getEnhancedLeaderboard(
  period: "week" | "month" | "all" = "week",
  limit = 15
): Promise<{
  leaderboard: (UploaderRankData & { rank: number; compositeScore: number; badge: { emoji: string; label: string; color: string } | null })[]
  totalStudents: number
}> {
  // Check cache first
  const cacheKey = CacheKeys.leaderboard(period)
  const cached = await cacheGet<ReturnType<typeof getEnhancedLeaderboard> extends Promise<infer T> ? T : never>(cacheKey)
  if (cached) return cached

  const pointsField =
    period === "week"
      ? "pointsThisWeek"
      : period === "month"
        ? "pointsThisMonth"
        : "pointsAllTime"

  // Get all users with streaks
  const streakUsers = await prisma.userStreak.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          supabaseId: true,
          reputation: true,
        },
      },
    },
  })

  // Get upload/engagement counts for all users
  const userIds = streakUsers.map((s) => s.userId)
  const [uploadCounts, downloadCounts, likeCounts] = await Promise.all([
    prisma.resource.groupBy({
      by: ["uploaderId"],
      where: { uploaderId: { in: userIds }, deletedAt: null },
      _count: { id: true },
    }),
    prisma.resource.groupBy({
      by: ["uploaderId"],
      where: { uploaderId: { in: userIds }, deletedAt: null },
      _sum: { downloadCount: true },
    }),
    prisma.resource.groupBy({
      by: ["uploaderId"],
      where: { uploaderId: { in: userIds }, deletedAt: null },
      _sum: { likeCount: true },
    }),
  ])

  const uploadMap = new Map(uploadCounts.map((u) => [u.uploaderId, u._count.id]))
  const downloadMap = new Map(downloadCounts.map((d) => [d.uploaderId, d._sum.downloadCount || 0]))
  const likeMap = new Map(likeCounts.map((l) => [l.uploaderId, l._sum.likeCount || 0]))

  // Build uploader rank data
  const rankedUploaders = streakUsers.map((streak) => {
    const data: UploaderRankData = {
      userId: streak.userId,
      name: streak.user.name || streak.user.email.split("@")[0],
      email: streak.user.email,
      image: streak.user.image,
      supabaseId: streak.user.supabaseId,
      flameScore: (streak as any)[pointsField] as number,
      currentStreak: streak.currentStreak,
      flameLevel: streak.flameLevel,
      trustScore: streak.user.reputation?.trustScore ?? 0.5,
      avgResourceQuality: streak.user.reputation?.avgResourceQuality ?? 0,
      reputationLevel: streak.user.reputation?.reputationLevel ?? "Newcomer",
      totalUploads: uploadMap.get(streak.userId) || 0,
      totalDownloadsReceived: downloadMap.get(streak.userId) || 0,
      totalLikesReceived: likeMap.get(streak.userId) || 0,
    }
    const compositeScore = computeUploaderRank(data)
    return { ...data, compositeScore }
  })

  // Sort by composite score
  rankedUploaders.sort((a, b) => b.compositeScore - a.compositeScore)

  // Assign badges and ranks
  const leaderboard = rankedUploaders.slice(0, limit).map((uploader, index) => {
    let badge: { emoji: string; label: string; color: string } | null = null
    if (uploader.reputationLevel === "Legend") badge = { emoji: "👑", label: "Legend", color: "#FFD700" }
    else if (uploader.reputationLevel === "Master") badge = { emoji: "⭐", label: "Master", color: "#F59E0B" }
    else if (uploader.reputationLevel === "Expert") badge = { emoji: "🎯", label: "Expert", color: "#8B5CF6" }
    else if (uploader.currentStreak >= 7) badge = { emoji: "🔥", label: "On Fire", color: "#F97316" }
    else if (uploader.totalUploads >= 20) badge = { emoji: "📚", label: "Top Uploader", color: "#4F8EF7" }

    return { ...uploader, rank: index + 1, badge }
  })

  const totalStudents = await prisma.userStreak.count()
  const result = { leaderboard, totalStudents }

  // Cache the result
  await cacheSet(cacheKey, result, CacheTTL.LEADERBOARD)

  return result
}

// ─── Popularity Velocity ───
// Computes the 7-day engagement velocity for a resource.

export async function computePopularityVelocity(resourceId: string): Promise<number> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [downloads, likes] = await Promise.all([
    prisma.resourceDownload.count({
      where: { resourceId, downloadedAt: { gte: sevenDaysAgo } },
    }),
    prisma.resourceLike.count({
      where: { resourceId, createdAt: { gte: sevenDaysAgo } },
    }),
  ])

  return downloads + likes * 2 // Likes weighted 2x
}
