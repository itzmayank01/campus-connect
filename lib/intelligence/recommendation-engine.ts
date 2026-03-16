/**
 * Recommendation Engine — Hybrid 3-Signal Personalized Feeds
 *
 * Combines:
 *   1. Content-Based Filtering (40%) — Subject/type/tag similarity
 *   2. Collaborative Filtering (35%) — User similarity patterns
 *   3. Contextual Signals (25%) — Exam proximity, trending, study patterns
 */

import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from "@/lib/redis"
import { getCollaborativeRecommendations } from "./collaborative-filter"
import {
  analyzeStudyPattern,
  getExamProximityBoosts,
  computeContextualBoost,
} from "./contextual-signals"

const BLEND_WEIGHTS = {
  contentBased: 0.40,
  collaborative: 0.35,
  contextual: 0.25,
}

// ─── Content-Based Filtering ───

interface ContentCandidate {
  resourceId: string
  score: number
  reason: string
}

/**
 * Get content-based recommendations based on user's interaction history.
 */
async function getContentBasedRecommendations(
  userId: string,
  limit = 30
): Promise<ContentCandidate[]> {
  // Get user's download and like history to understand preferences
  const [downloads, likes, bookmarks] = await Promise.all([
    prisma.resourceDownload.findMany({
      where: { userId },
      include: { resource: { select: { subjectId: true, resourceType: true, tags: true } } },
      orderBy: { downloadedAt: "desc" },
      take: 50,
    }),
    prisma.resourceLike.findMany({
      where: { likedByUserId: userId },
      include: { resource: { select: { subjectId: true, resourceType: true, tags: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.bookmark.findMany({
      where: { userId },
      include: { note: { select: { subjectId: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // Build preference profile
  const subjectScores = new Map<string, number>()
  const typeScores = new Map<string, number>()
  const tagScores = new Map<string, number>()

  // Weight recent interactions higher
  const addPreference = (subjectId: string, type: string, tags: string[], weight: number) => {
    subjectScores.set(subjectId, (subjectScores.get(subjectId) || 0) + weight)
    typeScores.set(type, (typeScores.get(type) || 0) + weight)
    tags.forEach((tag) => {
      tagScores.set(tag.toLowerCase(), (tagScores.get(tag.toLowerCase()) || 0) + weight)
    })
  }

  downloads.forEach((d, i) => {
    const recencyWeight = 1 / (1 + i * 0.1) // More recent = higher weight
    addPreference(d.resource.subjectId, d.resource.resourceType, d.resource.tags, recencyWeight)
  })

  likes.forEach((l, i) => {
    const recencyWeight = 1.5 / (1 + i * 0.1) // Likes weighted 1.5× vs downloads
    addPreference(l.resource.subjectId, l.resource.resourceType, l.resource.tags, recencyWeight)
  })

  // Get user's existing interactions to exclude
  const interactedResourceIds = new Set([
    ...downloads.map((d) => d.resourceId),
    ...likes.map((l) => l.resourceId),
  ])

  if (subjectScores.size === 0) {
    // Cold start: recommend recent high-quality resources
    const topResources = await prisma.resource.findMany({
      where: { deletedAt: null, isPublic: true },
      orderBy: { qualityScore: "desc" },
      take: limit,
      select: { id: true },
    })
    return topResources.map((r) => ({
      resourceId: r.id,
      score: 0.5,
      reason: "Top rated on campus",
    }))
  }

  // Get top preferred subjects and types
  const topSubjects = [...subjectScores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  const topTypes = [...typeScores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type)

  // Find candidate resources matching preferences
  const candidates = await prisma.resource.findMany({
    where: {
      deletedAt: null,
      isPublic: true,
      id: { notIn: [...interactedResourceIds] },
      OR: [
        { subjectId: { in: topSubjects } },
        { resourceType: { in: topTypes as any } },
      ],
    },
    orderBy: { qualityScore: "desc" },
    take: limit * 2,
    select: {
      id: true,
      subjectId: true,
      resourceType: true,
      tags: true,
      qualityScore: true,
    },
  })

  // Score each candidate
  const maxSubjectScore = Math.max(...subjectScores.values(), 1)
  const maxTypeScore = Math.max(...typeScores.values(), 1)

  return candidates
    .map((candidate) => {
      const subjectMatch = (subjectScores.get(candidate.subjectId) || 0) / maxSubjectScore
      const typeMatch = (typeScores.get(candidate.resourceType) || 0) / maxTypeScore

      // Tag similarity (Jaccard coefficient)
      const candidateTags = new Set(candidate.tags.map((t) => t.toLowerCase()))
      const userTags = new Set(tagScores.keys())
      const tagIntersection = [...candidateTags].filter((t) => userTags.has(t)).length
      const tagUnion = new Set([...candidateTags, ...userTags]).size
      const tagMatch = tagUnion > 0 ? tagIntersection / tagUnion : 0

      const score = subjectMatch * 0.5 + typeMatch * 0.3 + tagMatch * 0.2

      let reason = "Matches your study interests"
      if (subjectMatch > 0.5) reason = "From a subject you frequently study"
      if (tagMatch > 0.3) reason = "Similar to resources you've liked"

      return { resourceId: candidate.id, score, reason }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ─── Hybrid Blender ───

export interface Recommendation {
  resourceId: string
  score: number
  reasons: string[]
  source: "content" | "collaborative" | "contextual" | "blended"
}

/**
 * Generate personalized "For You" recommendations by blending all signals.
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit = 20
): Promise<Recommendation[]> {
  // Check cache
  const cacheKey = CacheKeys.recommendations(userId)
  const cached = await cacheGet<Recommendation[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  // Run all recommendation sources in parallel
  const [contentRecs, collabRecs, studyPattern, examBoosts] = await Promise.all([
    getContentBasedRecommendations(userId, limit * 2),
    getCollaborativeRecommendations(userId, limit * 2),
    analyzeStudyPattern(userId),
    getExamProximityBoosts(),
  ])

  // Merge scores into a unified map
  const scoreMap = new Map<string, { score: number; reasons: string[] }>()

  const addScore = (resourceId: string, score: number, weight: number, reason: string) => {
    const existing = scoreMap.get(resourceId) || { score: 0, reasons: [] }
    existing.score += score * weight
    if (reason && !existing.reasons.includes(reason)) {
      existing.reasons.push(reason)
    }
    scoreMap.set(resourceId, existing)
  }

  // Content-based scores
  for (const rec of contentRecs) {
    addScore(rec.resourceId, rec.score, BLEND_WEIGHTS.contentBased, rec.reason)
  }

  // Collaborative scores
  for (const rec of collabRecs) {
    addScore(rec.resourceId, rec.score, BLEND_WEIGHTS.collaborative, rec.reason)
  }

  // Contextual boosts — need resource details for this
  const allResourceIds = [...scoreMap.keys()]
  if (allResourceIds.length > 0) {
    const resources = await prisma.resource.findMany({
      where: { id: { in: allResourceIds } },
      select: { id: true, subjectId: true, resourceType: true },
    })

    for (const resource of resources) {
      const { boost, reasons } = await computeContextualBoost(
        resource.subjectId,
        resource.resourceType,
        studyPattern,
        examBoosts
      )

      if (boost > 1.0) {
        const existing = scoreMap.get(resource.id)
        if (existing) {
          existing.score *= boost * BLEND_WEIGHTS.contextual + (1 - BLEND_WEIGHTS.contextual)
          existing.reasons.push(...reasons)
          scoreMap.set(resource.id, existing)
        }
      }
    }
  }

  // Sort and return top recommendations
  const recommendations: Recommendation[] = [...scoreMap.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, limit)
    .map(([resourceId, { score, reasons }]) => ({
      resourceId,
      score: Math.round(score * 10000) / 10000,
      reasons: reasons.slice(0, 3), // Max 3 reasons per recommendation
      source: "blended" as const,
    }))

  // Cache the result
  await cacheSet(cacheKey, recommendations, CacheTTL.RECOMMENDATIONS)

  return recommendations
}

/**
 * Update user behavior profile after an interaction event.
 */
export async function updateBehaviorProfile(userId: string): Promise<void> {
  const pattern = await analyzeStudyPattern(userId)

  await prisma.userBehaviorProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredSubjects: pattern.recentSubjects,
      preferredResourceTypes: pattern.preferredTypes,
      avgSessionHour: pattern.avgHour,
      totalInteractions: 1,
    },
    update: {
      preferredSubjects: pattern.recentSubjects,
      preferredResourceTypes: pattern.preferredTypes,
      avgSessionHour: pattern.avgHour,
      totalInteractions: { increment: 1 },
      lastProfileUpdate: new Date(),
    },
  })
}
