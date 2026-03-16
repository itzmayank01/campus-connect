import { Redis } from "@upstash/redis"

// Serverless Redis client — works with Vercel Edge + Serverless Functions
// Falls back gracefully if Redis is not configured (dev without Redis)

let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn("[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — caching disabled")
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

// ─── Cache helpers with graceful fallback ───

/**
 * Get a value from Redis cache. Returns null if Redis is not configured or key doesn't exist.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    if (!client) return null
    return await client.get<T>(key)
  } catch (error) {
    console.error("[Redis] GET error:", error)
    return null
  }
}

/**
 * Set a value in Redis cache with a TTL (in seconds).
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient()
    if (!client) return
    await client.set(key, value, { ex: ttlSeconds })
  } catch (error) {
    console.error("[Redis] SET error:", error)
  }
}

/**
 * Delete a cache key (for invalidation).
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    if (!client) return
    await client.del(key)
  } catch (error) {
    console.error("[Redis] DEL error:", error)
  }
}

/**
 * Delete all keys matching a pattern (for bulk invalidation).
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient()
    if (!client) return
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => client.del(k)))
    }
  } catch (error) {
    console.error("[Redis] DEL pattern error:", error)
  }
}

// ─── Cache key builders ───

export const CacheKeys = {
  qualityScore: (resourceId: string) => `quality:resource:${resourceId}`,
  trendingGlobal: () => `trending:global`,
  trendingSubject: (subjectId: string) => `trending:subject:${subjectId}`,
  recommendations: (userId: string) => `rec:user:${userId}`,
  leaderboard: (period: string) => `rank:leaderboard:${period}`,
  userProfile: (userId: string) => `profile:user:${userId}`,
  coDownload: (resourceId: string) => `co-download:${resourceId}`,
} as const

export const CacheTTL = {
  QUALITY_SCORE: 3600,        // 1 hour
  TRENDING: 900,              // 15 minutes
  RECOMMENDATIONS: 1800,      // 30 minutes
  LEADERBOARD: 300,           // 5 minutes
  USER_PROFILE: 3600,         // 1 hour
  CO_DOWNLOAD: 21600,         // 6 hours
} as const

export { redis, getRedisClient }
