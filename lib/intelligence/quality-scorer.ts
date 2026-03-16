/**
 * Quality Scorer — Wilson-Bayesian Composite Score
 *
 * Computes a multi-signal quality score for each resource combining:
 *   1. Wilson Score (statistical confidence on ratings)
 *   2. Engagement Score (downloads, likes, bookmarks)
 *   3. Freshness Decay (time-based decay)
 *   4. Uploader Trust (uploader's historical quality)
 */

import { prisma } from "@/lib/prisma"

// ─── Configurable Weights ───

const WEIGHTS = {
  wilson: 0.35,
  engagement: 0.30,
  freshness: 0.15,
  uploaderTrust: 0.20,
}

const FRESHNESS_HALF_LIFE_DAYS = 30
const ENGAGEMENT_SUB_WEIGHTS = { download: 0.5, like: 0.3, bookmark: 0.2 }

// ─── Wilson Score ───
// Lower bound of Wilson confidence interval for a Bernoulli parameter.
// Handles "5.0 from 1 rating" vs "4.2 from 50 ratings" properly.

export function computeWilsonScore(
  averageRating: number,
  ratingCount: number,
  maxRating = 5,
  z = 1.96 // 95% confidence
): number {
  if (ratingCount === 0) return 0

  // Normalize rating to 0-1 scale
  const p = averageRating / maxRating
  const n = ratingCount

  const denominator = 1 + (z * z) / n
  const center = p + (z * z) / (2 * n)
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)

  // Lower bound of Wilson interval
  const score = (center - spread) / denominator
  return Math.max(0, Math.min(1, score))
}

// ─── Engagement Score ───
// Log-normalized engagement combining downloads, likes, and bookmarks.

export function computeEngagementScore(
  downloads: number,
  likes: number,
  bookmarks: number
): number {
  const d = Math.log(1 + downloads) * ENGAGEMENT_SUB_WEIGHTS.download
  const l = Math.log(1 + likes) * ENGAGEMENT_SUB_WEIGHTS.like
  const b = Math.log(1 + bookmarks) * ENGAGEMENT_SUB_WEIGHTS.bookmark

  const rawScore = d + l + b

  // Normalize to 0-1 using a sigmoid-like function
  // Score of ~10 (roughly 1000 downloads + 100 likes + 50 bookmarks) ≈ 0.9
  return rawScore / (rawScore + 3)
}

// ─── Freshness Decay ───
// Exponential decay with configurable half-life.

export function computeFreshnessDecay(
  createdAt: Date,
  now: Date = new Date()
): number {
  const ageMs = now.getTime() - createdAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  return 1 / (1 + ageDays / FRESHNESS_HALF_LIFE_DAYS)
}

// ─── Uploader Trust ───
// Trust score based on the uploader's historical resource quality.

export async function computeUploaderTrust(
  uploaderId: string
): Promise<number> {
  const reputation = await prisma.userReputation.findUnique({
    where: { userId: uploaderId },
  })

  if (!reputation) return 0.5 // Default trust for new uploaders

  return reputation.trustScore
}

// ─── Composite Quality Score ───
// Combines all signals into a single 0-1 score.

interface QualityInput {
  averageRating: number
  ratingCount: number
  downloadCount: number
  likeCount: number
  bookmarkCount: number
  createdAt: Date
  uploaderId: string
}

export async function computeQualityScore(
  input: QualityInput
): Promise<{ qualityScore: number; breakdown: Record<string, number> }> {
  const wilson = computeWilsonScore(input.averageRating, input.ratingCount)
  const engagement = computeEngagementScore(
    input.downloadCount,
    input.likeCount,
    input.bookmarkCount
  )
  const freshness = computeFreshnessDecay(input.createdAt)
  const uploaderTrust = await computeUploaderTrust(input.uploaderId)

  const qualityScore =
    WEIGHTS.wilson * wilson +
    WEIGHTS.engagement * engagement +
    WEIGHTS.freshness * freshness +
    WEIGHTS.uploaderTrust * uploaderTrust

  return {
    qualityScore: Math.round(qualityScore * 10000) / 10000, // 4 decimal precision
    breakdown: { wilson, engagement, freshness, uploaderTrust },
  }
}

// ─── Trending Score ───
// Measures recent engagement velocity (last 7 days vs overall).

export async function computeTrendingScore(
  resourceId: string,
  downloadCount: number,
  likeCount: number
): Promise<number> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [recentDownloads, recentLikes] = await Promise.all([
    prisma.resourceDownload.count({
      where: { resourceId, downloadedAt: { gte: sevenDaysAgo } },
    }),
    prisma.resourceLike.count({
      where: { resourceId, createdAt: { gte: sevenDaysAgo } },
    }),
  ])

  // Velocity = recent / total ratio × recency boost
  const downloadVelocity = downloadCount > 0 ? recentDownloads / downloadCount : 0
  const likeVelocity = likeCount > 0 ? recentLikes / likeCount : 0

  // Weight recent absolute numbers too (a resource with 50 downloads in 7d is hotter than one with 2/2)
  const absoluteBoost = Math.log(1 + recentDownloads + recentLikes * 2)

  const trendingScore =
    (downloadVelocity * 0.4 + likeVelocity * 0.3) * 0.5 +
    (absoluteBoost / (absoluteBoost + 5)) * 0.5

  return Math.round(trendingScore * 10000) / 10000
}

// ─── Uploader Reputation Recompute ───
// Recomputes a user's trust score and reputation level.

const REPUTATION_LEVELS = [
  { minTrust: 0.0, label: "Newcomer" },
  { minTrust: 0.3, label: "Contributor" },
  { minTrust: 0.5, label: "Trusted" },
  { minTrust: 0.7, label: "Expert" },
  { minTrust: 0.85, label: "Master" },
  { minTrust: 0.95, label: "Legend" },
]

export async function recomputeUploaderReputation(userId: string): Promise<void> {
  const resources = await prisma.resource.findMany({
    where: { uploaderId: userId, deletedAt: null },
    select: { qualityScore: true, isVerified: true, downloadCount: true, likeCount: true },
  })

  if (resources.length === 0) return

  const avgQuality =
    resources.reduce((sum, r) => sum + r.qualityScore, 0) / resources.length
  const totalVerified = resources.filter((r) => r.isVerified).length
  const totalEngagement = resources.reduce(
    (sum, r) => sum + r.downloadCount + r.likeCount * 2,
    0
  )

  // Trust = weighted combination of quality, verification rate, and engagement
  const qualityFactor = avgQuality                                        // 0-1
  const verifyFactor = resources.length > 0 ? totalVerified / resources.length : 0  // 0-1
  const volumeFactor = Math.log(1 + resources.length) / (Math.log(1 + resources.length) + 2) // 0-1
  const engagementFactor = Math.log(1 + totalEngagement) / (Math.log(1 + totalEngagement) + 5) // 0-1

  const trustScore =
    qualityFactor * 0.4 +
    verifyFactor * 0.2 +
    volumeFactor * 0.2 +
    engagementFactor * 0.2

  const level = [...REPUTATION_LEVELS]
    .reverse()
    .find((l) => trustScore >= l.minTrust)?.label || "Newcomer"

  await prisma.userReputation.upsert({
    where: { userId },
    create: {
      userId,
      trustScore: Math.round(trustScore * 10000) / 10000,
      avgResourceQuality: Math.round(avgQuality * 10000) / 10000,
      totalVerifiedUploads: totalVerified,
      helpfulnessScore: Math.round(engagementFactor * 10000) / 10000,
      reputationLevel: level,
    },
    update: {
      trustScore: Math.round(trustScore * 10000) / 10000,
      avgResourceQuality: Math.round(avgQuality * 10000) / 10000,
      totalVerifiedUploads: totalVerified,
      helpfulnessScore: Math.round(engagementFactor * 10000) / 10000,
      reputationLevel: level,
    },
  })
}

// ─── Batch Recompute ───
// Recompute quality scores for all active resources + all uploader reputations.

export async function batchRecomputeScores(): Promise<{
  resourcesUpdated: number
  uploadersUpdated: number
}> {
  const resources = await prisma.resource.findMany({
    where: { deletedAt: null },
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

  let resourcesUpdated = 0
  const uploaderIds = new Set<string>()

  // Recompute quality + trending for each resource
  for (const resource of resources) {
    const { qualityScore } = await computeQualityScore({
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
      where: { id: resource.id },
      data: {
        qualityScore,
        trendingScore,
        lastScoredAt: new Date(),
      },
    })

    uploaderIds.add(resource.uploaderId)
    resourcesUpdated++
  }

  // Recompute reputation for all uploaders
  let uploadersUpdated = 0
  for (const uploaderId of uploaderIds) {
    await recomputeUploaderReputation(uploaderId)
    uploadersUpdated++
  }

  return { resourcesUpdated, uploadersUpdated }
}
