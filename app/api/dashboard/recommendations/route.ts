import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Param overrides for specific switcher / tabs
    const targetQuery = request.nextUrl.searchParams.get("query")
    const resourceTypeParam = request.nextUrl.searchParams.get("type")

    // Find ALL repeated searches for this user in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const repeatedSearchesResult = await prisma.$queryRaw<
      Array<{ search_query: string; search_count: bigint; last_searched: Date }>
    >`
      SELECT 
        search_query,
        COUNT(*) as search_count,
        MAX(created_at) as last_searched
      FROM user_behavior_events
      WHERE user_id = ${dbUser.id}
        AND event_type = 'search'
        AND created_at > ${sevenDaysAgo}
      GROUP BY search_query
      HAVING COUNT(*) >= 2
      ORDER BY search_count DESC, last_searched DESC
      LIMIT 3
    `

    if (!repeatedSearchesResult || repeatedSearchesResult.length === 0) {
      return NextResponse.json({ has_recommendation: false })
    }

    // Determine the active trigger
    const triggers = repeatedSearchesResult.map(row => ({
      query: row.search_query,
      count: Number(row.search_count),
      last_searched: row.last_searched
    }))

    const activeTrigger = targetQuery 
      ? triggers.find(t => t.query === targetQuery) || triggers[0]
      : triggers[0]

    // Find matching resources for the active trigger
    const query = activeTrigger.query
    const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'this', 'that'])
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
    
    if (queryWords.length === 0) {
      queryWords.push(query)
    }

    let whereClause: any = {
      deletedAt: null,
      isPublic: true,
      AND: queryWords.map((word) => ({
        OR: [
          { originalFilename: { contains: word, mode: "insensitive" as const } },
          { description: { contains: word, mode: "insensitive" as const } },
          { subject: { name: { contains: word, mode: "insensitive" as const } } },
          { subject: { code: { contains: word, mode: "insensitive" as const } } },
          { tags: { hasSome: [word] } },
          { aiTags: { hasSome: [word] } },
        ],
      })),
    }

    if (resourceTypeParam && resourceTypeParam !== 'all') {
      whereClause.resourceType = resourceTypeParam.toUpperCase()
    }

    const resources = await prisma.resource.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true, code: true, semesterId: true } },
        uploader: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [
        { downloadCount: "desc" },
        { likeCount: "desc" },
      ],
      take: 5,
    })

    const enriched = resources.map(r => ({
      id: r.id,
      title: r.originalFilename,
      resourceType: r.resourceType,
      fileSize: r.fileSize,
      downloadCount: r.downloadCount,
      likeCount: r.likeCount,
      averageRating: r.averageRating,
      subjectId: r.subjectId,
      subjectCode: r.subject.code,
      subjectName: r.subject.name,
      semester: r.subject.semesterId,
      uploaderName: r.uploader.name || r.uploader.email.split("@")[0],
      mimeType: r.mimeType,
      resourceUrl: r.resourceUrl,
      youtubeThumbnail: r.youtubeThumbnail
    }))

    // Calculate type counts dynamically
    // If they filtered by type, we won't get accurate counts for 'All', but it's okay for now.
    // Instead of querying all counts, we can do a secondary global search if needed. Or just return standard format.
    
    // We will just do a fast raw query for counts:
    let typeCountsRow = await prisma.resource.groupBy({
      by: ['resourceType'],
      where: {
        deletedAt: null,
        isPublic: true,
        AND: queryWords.map((word) => ({
          OR: [
            { originalFilename: { contains: word, mode: "insensitive" as const } },
            { description: { contains: word, mode: "insensitive" as const } },
            { subject: { name: { contains: word, mode: "insensitive" as const } } },
            { subject: { code: { contains: word, mode: "insensitive" as const } } },
            { tags: { hasSome: [word] } },
            { aiTags: { hasSome: [word] } },
          ],
        })),
      },
      _count: { _all: true }
    })
    
    const typeCounts: Record<string, number> = {
      NOTES: 0, QUESTION_PAPERS: 0, VIDEOS: 0, SYLLABUS: 0, REFERENCE: 0, all: 0
    }
    for (const row of typeCountsRow) {
      typeCounts[row.resourceType] = row._count._all
      typeCounts.all += row._count._all
    }

    return NextResponse.json({
      has_recommendation: true,
      trigger: activeTrigger,
      resources: enriched,
      typeCounts,
      subject: resources[0]?.subject || null,
      other_triggers: triggers.filter(t => t.query !== activeTrigger.query)
    })
  } catch (error: unknown) {
    console.error("Dashboard recommendations error:", error)
    return NextResponse.json({ has_recommendation: false })
  }
}
