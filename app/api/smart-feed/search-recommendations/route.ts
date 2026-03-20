import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/smart-feed/search-recommendations?query=compiler+design
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get("query")?.toLowerCase().trim()
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get search count for this query
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const searchCountResult = await prisma.$queryRaw<
      Array<{ total_count: bigint }>
    >`
      SELECT COALESCE(SUM(cnt), 0) as total_count FROM (
        SELECT COUNT(*) as cnt
        FROM user_behavior_events
        WHERE user_id = ${dbUser.id}
          AND event_type = 'search'
          AND (
            search_query ILIKE '%' || ${query} || '%'
            OR ${query} ILIKE '%' || search_query || '%'
          )
          AND created_at > ${sevenDaysAgo}
      ) sub
    `

    const searchCount = Number(searchCountResult[0]?.total_count || 0)

    // Find all matching resources
    const queryWords = query.split(/\s+/).filter(Boolean)
    const resources = await prisma.resource.findMany({
      where: {
        deletedAt: null,
        isPublic: true,
        OR: [
          ...queryWords.map((word) => ({
            originalFilename: { contains: word, mode: "insensitive" as const },
          })),
          ...queryWords.map((word) => ({
            description: { contains: word, mode: "insensitive" as const },
          })),
          ...queryWords.map((word) => ({
            subject: { name: { contains: word, mode: "insensitive" as const } },
          })),
          ...queryWords.map((word) => ({
            subject: { code: { contains: word, mode: "insensitive" as const } },
          })),
          { tags: { hasSome: queryWords } },
          { aiTags: { hasSome: queryWords } },
        ],
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploader: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { downloadCount: "desc" },
    })

    // Find max downloads for popularity calculation
    const maxDownloads = Math.max(...resources.map((r) => r.downloadCount), 1)

    // Sort into tiers
    const mostPopular = resources
      .filter((r) => r.downloadCount >= 50)
      .sort((a, b) => b.downloadCount - a.downloadCount)
    const frequentlyUsed = resources
      .filter((r) => r.downloadCount >= 10 && r.downloadCount < 50)
      .sort((a, b) => b.downloadCount - a.downloadCount)
    const recentlyAdded = resources
      .filter((r) => r.downloadCount >= 1 && r.downloadCount < 10)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const notExplored = resources
      .filter((r) => r.downloadCount === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Build ranked list with global rank
    let globalRank = 0
    const ranked = [...mostPopular, ...frequentlyUsed, ...recentlyAdded, ...notExplored].map(
      (r) => {
        globalRank++
        const tier =
          r.downloadCount >= 50
            ? "most_popular"
            : r.downloadCount >= 10
            ? "frequently_used"
            : r.downloadCount >= 1
            ? "recently_added"
            : "not_explored"

        return {
          rank: globalRank,
          tier,
          id: r.id,
          filename: r.originalFilename,
          description: r.description,
          subject: r.subject,
          resourceType: r.resourceType,
          semester: r.semester,
          downloadCount: r.downloadCount,
          likeCount: r.likeCount,
          averageRating: r.averageRating,
          bookmarkCount: r.bookmarkCount,
          popularityPercent: Math.round((r.downloadCount / maxDownloads) * 100),
          mimeType: r.mimeType,
          s3Key: r.s3Key,
          resourceUrl: r.resourceUrl,
          uploader: {
            name: r.uploader.name || r.uploader.email.split("@")[0],
            image: r.uploader.image,
          },
          createdAt: r.createdAt,
        }
      }
    )

    // Type counts for filter tabs
    const typeCounts: Record<string, number> = {
      all: ranked.length,
      NOTES: 0,
      QUESTION_PAPERS: 0,
      VIDEOS: 0,
      REFERENCE: 0,
    }
    for (const r of ranked) {
      typeCounts[r.resourceType] = (typeCounts[r.resourceType] || 0) + 1
    }

    return NextResponse.json({
      query,
      searchCount,
      resources: ranked,
      typeCounts,
      tiers: {
        most_popular: mostPopular.length,
        frequently_used: frequentlyUsed.length,
        recently_added: recentlyAdded.length,
        not_explored: notExplored.length,
      },
    })
  } catch (error: unknown) {
    console.error("Search recommendations error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to get recommendations", details: message },
      { status: 500 }
    )
  }
}
