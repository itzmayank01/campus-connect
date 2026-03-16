/**
 * Collaborative Filter — Jaccard-Based User Similarity
 *
 * Finds similar users based on shared resource interactions
 * and recommends resources that similar users liked/downloaded
 * but the target user hasn't interacted with yet.
 */

import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from "@/lib/redis"

// ─── Jaccard Similarity ───

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

// ─── Find Similar Users ───

interface SimilarUser {
  userId: string
  similarity: number
}

/**
 * Find users most similar to the target user based on their
 * download + like + rating interaction patterns.
 */
export async function findSimilarUsers(
  targetUserId: string,
  limit = 10
): Promise<SimilarUser[]> {
  // Get target user's interactions
  const [targetDownloads, targetLikes, targetRatings] = await Promise.all([
    prisma.resourceDownload.findMany({
      where: { userId: targetUserId },
      select: { resourceId: true },
    }),
    prisma.resourceLike.findMany({
      where: { likedByUserId: targetUserId },
      select: { resourceId: true },
    }),
    prisma.resourceRating.findMany({
      where: { userId: targetUserId },
      select: { resourceId: true },
    }),
  ])

  const targetSet = new Set([
    ...targetDownloads.map((d) => d.resourceId),
    ...targetLikes.map((l) => l.resourceId),
    ...targetRatings.map((r) => r.resourceId),
  ])

  if (targetSet.size === 0) return []

  // Get all other users who interacted with the same resources
  const relatedUserIds = new Set<string>()

  const [relatedDownloads, relatedLikes] = await Promise.all([
    prisma.resourceDownload.findMany({
      where: {
        resourceId: { in: [...targetSet] },
        userId: { not: targetUserId },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.resourceLike.findMany({
      where: {
        resourceId: { in: [...targetSet] },
        likedByUserId: { not: targetUserId },
      },
      select: { likedByUserId: true },
      distinct: ["likedByUserId"],
    }),
  ])

  relatedDownloads.forEach((d) => relatedUserIds.add(d.userId))
  relatedLikes.forEach((l) => relatedUserIds.add(l.likedByUserId))

  if (relatedUserIds.size === 0) return []

  // Compute similarity for each related user
  const similarities: SimilarUser[] = []

  for (const userId of relatedUserIds) {
    const [userDownloads, userLikes, userRatings] = await Promise.all([
      prisma.resourceDownload.findMany({
        where: { userId },
        select: { resourceId: true },
      }),
      prisma.resourceLike.findMany({
        where: { likedByUserId: userId },
        select: { resourceId: true },
      }),
      prisma.resourceRating.findMany({
        where: { userId },
        select: { resourceId: true },
      }),
    ])

    const userSet = new Set([
      ...userDownloads.map((d) => d.resourceId),
      ...userLikes.map((l) => l.resourceId),
      ...userRatings.map((r) => r.resourceId),
    ])

    const similarity = jaccardSimilarity(targetSet, userSet)

    if (similarity > 0.05) {
      // Minimum similarity threshold
      similarities.push({ userId, similarity })
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

// ─── Co-Download Recommendations ───

/**
 * Find resources that users who downloaded resourceId also downloaded.
 * "Users who downloaded X also downloaded Y"
 */
export async function getCoDownloadRecommendations(
  resourceId: string,
  limit = 10
): Promise<string[]> {
  // Check cache
  const cacheKey = CacheKeys.coDownload(resourceId)
  const cached = await cacheGet<string[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  // Find users who downloaded this resource
  const downloaders = await prisma.resourceDownload.findMany({
    where: { resourceId },
    select: { userId: true },
    distinct: ["userId"],
    take: 50, // Cap to avoid huge queries
  })

  if (downloaders.length === 0) return []

  const downloaderIds = downloaders.map((d) => d.userId)

  // Find other resources these users also downloaded
  const coDownloads = await prisma.resourceDownload.groupBy({
    by: ["resourceId"],
    where: {
      userId: { in: downloaderIds },
      resourceId: { not: resourceId },
    },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: limit * 2, // Fetch more than needed for filtering
  })

  const result = coDownloads
    .filter((cd) => cd._count.userId >= 2) // At least 2 users in common
    .slice(0, limit)
    .map((cd) => cd.resourceId)

  // Cache the result
  await cacheSet(cacheKey, result, CacheTTL.CO_DOWNLOAD)

  return result
}

// ─── Collaborative Recommendations for User ───

/**
 * Get resource recommendations for a user based on collaborative filtering.
 * Combines similar-user preferences and co-download patterns.
 */
export async function getCollaborativeRecommendations(
  userId: string,
  limit = 20
): Promise<{ resourceId: string; score: number; reason: string }[]> {
  const similarUsers = await findSimilarUsers(userId, 10)

  if (similarUsers.length === 0) return []

  // Get user's existing interactions to exclude
  const [userDownloads, userLikes] = await Promise.all([
    prisma.resourceDownload.findMany({
      where: { userId },
      select: { resourceId: true },
    }),
    prisma.resourceLike.findMany({
      where: { likedByUserId: userId },
      select: { resourceId: true },
    }),
  ])

  const userInteractions = new Set([
    ...userDownloads.map((d) => d.resourceId),
    ...userLikes.map((l) => l.resourceId),
  ])

  // Aggregate recommendations from similar users
  const scoreMap = new Map<string, number>()

  for (const similar of similarUsers) {
    const [downloads, likes] = await Promise.all([
      prisma.resourceDownload.findMany({
        where: { userId: similar.userId },
        select: { resourceId: true },
      }),
      prisma.resourceLike.findMany({
        where: { likedByUserId: similar.userId },
        select: { resourceId: true },
      }),
    ])

    const theirResources = new Set([
      ...downloads.map((d) => d.resourceId),
      ...likes.map((l) => l.resourceId),
    ])

    for (const resourceId of theirResources) {
      if (!userInteractions.has(resourceId)) {
        const current = scoreMap.get(resourceId) || 0
        scoreMap.set(resourceId, current + similar.similarity)
      }
    }
  }

  return [...scoreMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([resourceId, score]) => ({
      resourceId,
      score: Math.round(score * 10000) / 10000,
      reason: "Students with similar interests found this helpful",
    }))
}
