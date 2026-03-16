/**
 * Contextual Signals — Situational Recommendation Boosters
 *
 * Provides context-aware boosts for:
 *   1. Exam Proximity — Boost resources for subjects with upcoming exams
 *   2. Trending Detection — Resources gaining engagement velocity
 *   3. Time-of-Day Matching — Personalize to study patterns
 */

import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from "@/lib/redis"

// ─── Exam Proximity Boost ───

interface ExamProximityResult {
  subjectId: string
  subjectName: string
  daysUntilExam: number
  boostMultiplier: number
}

/**
 * Get subjects with upcoming exams and their proximity boost multipliers.
 * Exams within 14 days get exponentially increasing boosts.
 */
export async function getExamProximityBoosts(): Promise<ExamProximityResult[]> {
  const now = new Date()
  const twoWeeksFromNow = new Date()
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  const upcomingExams = await prisma.exam.findMany({
    where: {
      date: { gte: now, lte: twoWeeksFromNow },
    },
    include: { subject: true },
    orderBy: { date: "asc" },
  })

  return upcomingExams.map((exam) => {
    const daysUntil = Math.max(
      0,
      Math.ceil((exam.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    // Boost formula: closer the exam, higher the boost
    // 0 days = 3×, 7 days = 2×, 14 days = 1.5×
    const boostMultiplier = 1 + 2 / (1 + daysUntil / 3)

    return {
      subjectId: exam.subjectId,
      subjectName: exam.subject.name,
      daysUntilExam: daysUntil,
      boostMultiplier: Math.round(boostMultiplier * 100) / 100,
    }
  })
}

// ─── Trending Detection ───

interface TrendingResource {
  id: string
  originalFilename: string
  subjectId: string
  resourceType: string
  trendingScore: number
  downloadCount: number
  likeCount: number
  qualityScore: number
  uploaderId: string
}

/**
 * Get globally trending resources based on 7-day engagement velocity.
 */
export async function getTrendingResources(
  limit = 20,
  subjectId?: string
): Promise<TrendingResource[]> {
  // Check cache
  const cacheKey = subjectId
    ? CacheKeys.trendingSubject(subjectId)
    : CacheKeys.trendingGlobal()
  const cached = await cacheGet<TrendingResource[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const where: any = { deletedAt: null, isPublic: true }
  if (subjectId) where.subjectId = subjectId

  const resources = await prisma.resource.findMany({
    where,
    orderBy: { trendingScore: "desc" },
    take: limit,
    select: {
      id: true,
      originalFilename: true,
      subjectId: true,
      resourceType: true,
      trendingScore: true,
      downloadCount: true,
      likeCount: true,
      qualityScore: true,
      uploaderId: true,
    },
  })

  // Cache the result
  await cacheSet(cacheKey, resources, CacheTTL.TRENDING)

  return resources
}

// ─── User Study Pattern Detection ───

interface StudyPattern {
  avgHour: number               // 0-23
  preferredTypes: string[]      // Ordered by preference
  mostActiveDay: number         // 0-6 (Sun-Sat)
  recentSubjects: string[]      // Subject IDs, ordered by recency
}

/**
 * Analyze a user's study patterns from their activity history.
 */
export async function analyzeStudyPattern(userId: string): Promise<StudyPattern> {
  // Check cache
  const cacheKey = CacheKeys.userProfile(userId)
  const cached = await cacheGet<StudyPattern>(cacheKey)
  if (cached) return cached

  // Get recent download events (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentDownloads = await prisma.resourceDownload.findMany({
    where: { userId, downloadedAt: { gte: thirtyDaysAgo } },
    include: {
      resource: {
        select: { subjectId: true, resourceType: true },
      },
    },
    orderBy: { downloadedAt: "desc" },
  })

  // Calculate average active hour
  const hours = recentDownloads.map((d) => d.downloadedAt.getHours())
  const avgHour = hours.length > 0
    ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
    : 20 // Default: evening study

  // Calculate most active day of week
  const dayCounts = new Array(7).fill(0)
  recentDownloads.forEach((d) => {
    dayCounts[d.downloadedAt.getDay()]++
  })
  const mostActiveDay = dayCounts.indexOf(Math.max(...dayCounts))

  // Calculate preferred resource types
  const typeCounts = new Map<string, number>()
  recentDownloads.forEach((d) => {
    const type = d.resource.resourceType
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  })
  const preferredTypes = [...typeCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([type]) => type)

  // Recent subjects (ordered by recency, deduplicated)
  const seen = new Set<string>()
  const recentSubjects: string[] = []
  for (const d of recentDownloads) {
    if (!seen.has(d.resource.subjectId)) {
      seen.add(d.resource.subjectId)
      recentSubjects.push(d.resource.subjectId)
    }
    if (recentSubjects.length >= 10) break
  }

  const pattern: StudyPattern = {
    avgHour,
    preferredTypes: preferredTypes.length > 0 ? preferredTypes : ["NOTES"],
    mostActiveDay,
    recentSubjects,
  }

  // Cache the result
  await cacheSet(cacheKey, pattern, CacheTTL.USER_PROFILE)

  return pattern
}

// ─── Contextual Score Computation ───

/**
 * Compute a contextual boost factor for a resource based on current signals.
 * Returns a multiplier (1.0 = neutral, >1.0 = boosted, <1.0 = demoted).
 */
export async function computeContextualBoost(
  resourceSubjectId: string,
  resourceType: string,
  userPattern: StudyPattern,
  examBoosts: ExamProximityResult[]
): Promise<{ boost: number; reasons: string[] }> {
  let boost = 1.0
  const reasons: string[] = []

  // Exam proximity boost
  const examBoost = examBoosts.find((e) => e.subjectId === resourceSubjectId)
  if (examBoost) {
    boost *= examBoost.boostMultiplier
    reasons.push(`Exam in ${examBoost.daysUntilExam} days`)
  }

  // Subject match boost (user recently interacted with this subject)
  const subjectIdx = userPattern.recentSubjects.indexOf(resourceSubjectId)
  if (subjectIdx !== -1) {
    const recencyBoost = 1 + 0.3 / (1 + subjectIdx) // First recent subject: +30%, second: +15%, etc.
    boost *= recencyBoost
    reasons.push("Matches your recent studies")
  }

  // Resource type preference boost
  const typeIdx = userPattern.preferredTypes.indexOf(resourceType)
  if (typeIdx !== -1) {
    const typeBoost = 1 + 0.15 / (1 + typeIdx)
    boost *= typeBoost
    reasons.push(`Matched preferred type: ${resourceType.toLowerCase()}`)
  }

  return {
    boost: Math.round(boost * 100) / 100,
    reasons,
  }
}
