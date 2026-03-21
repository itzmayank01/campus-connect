import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { rankResources } from "@/lib/intelligence/ranking-engine"

// GET /api/search?q=calculus&subject=xxx&type=NOTES&semester=4&sort=relevance|quality|trending|recent&limit=20
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const query = params.get("q") || ""
    const subjectId = params.get("subject") || undefined
    const resourceType = params.get("type") || undefined
    const semester = params.get("semester") ? parseInt(params.get("semester")!, 10) : undefined
    const sort = params.get("sort") || "relevance"
    const limit = parseInt(params.get("limit") || "20", 10)

    // Build where clause
    const where: any = { deletedAt: null, isPublic: true }

    if (query) {
      const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'this', 'that'])
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
      
      if (queryWords.length === 0) {
        queryWords.push(query)
      }
      
      where.AND = queryWords.map(word => ({
        OR: [
          { originalFilename: { contains: word, mode: "insensitive" } },
          { description: { contains: word, mode: "insensitive" } },
          { tags: { hasSome: [word] } },
          { subject: { name: { contains: word, mode: "insensitive" } } },
          { subject: { code: { contains: word, mode: "insensitive" } } }
        ]
      }))
    }

    if (subjectId) where.subjectId = subjectId
    if (resourceType) where.resourceType = resourceType
    if (semester) where.semester = semester

    // Determine sort order
    let orderBy: any = { qualityScore: "desc" }
    if (sort === "trending") orderBy = { trendingScore: "desc" }
    else if (sort === "recent") orderBy = { createdAt: "desc" }
    else if (sort === "quality") orderBy = { qualityScore: "desc" }
    // For "relevance", we use the ranking engine below

    const resources = await prisma.resource.findMany({
      where,
      orderBy: sort !== "relevance" ? orderBy : { createdAt: "desc" },
      take: sort === "relevance" ? limit * 3 : limit, // Fetch more for relevance ranking
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

    let finalResources = resources

    // Apply multi-signal ranking for relevance sort
    if (sort === "relevance" && resources.length > 0) {
      const ranked = rankResources(
        resources.map((r) => ({
          id: r.id,
          qualityScore: r.qualityScore,
          trendingScore: r.trendingScore,
          downloadCount: r.downloadCount,
          likeCount: r.likeCount,
          uploaderId: r.uploaderId,
          subjectId: r.subjectId,
          resourceType: r.resourceType,
          createdAt: r.createdAt,
        })),
        { subjectId, resourceType }
      )

      const rankedIds = ranked.map((r) => r.id)
      const resourceMap = new Map(resources.map((r) => [r.id, r]))
      finalResources = rankedIds
        .map((id) => resourceMap.get(id)!)
        .filter(Boolean)
        .slice(0, limit)
    }

    const results = finalResources.map((resource) => ({
      id: resource.id,
      filename: resource.originalFilename,
      description: resource.description,
      subject: resource.subject,
      resourceType: resource.resourceType,
      semester: resource.semester,
      downloadCount: resource.downloadCount,
      likeCount: resource.likeCount,
      qualityScore: resource.qualityScore,
      trendingScore: resource.trendingScore,
      tags: resource.tags,
      uploader: {
        name: resource.uploader.name || resource.uploader.email.split("@")[0],
        image: resource.uploader.image,
        reputationLevel: resource.uploader.reputation?.reputationLevel || "Newcomer",
      },
      createdAt: resource.createdAt,
    }))

    return NextResponse.json({
      results,
      totalCount: results.length,
      query,
      sort,
    })
  } catch (error: any) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Failed to search resources", details: error.message },
      { status: 500 }
    )
  }
}
