import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/resources?type=NOTES&search=keyword&limit=50
// Returns all public resources across all subjects — unified endpoint
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const resourceType = params.get("type") || undefined
    const searchQuery = params.get("search") || ""
    const limit = Math.min(parseInt(params.get("limit") || "50", 10), 100)

    const where: any = {
      isPublic: true,
      deletedAt: null,
    }

    if (resourceType && resourceType !== "all") {
      where.resourceType = resourceType
    }

    if (searchQuery) {
      where.OR = [
        { originalFilename: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { youtubeTitle: { contains: searchQuery, mode: "insensitive" } },
        { subject: { name: { contains: searchQuery, mode: "insensitive" } } },
        { subject: { code: { contains: searchQuery, mode: "insensitive" } } },
      ]
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
      ],
      take: limit,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      resources,
      totalCount: resources.length,
    })
  } catch (error: unknown) {
    console.error("Resources fetch error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch resources", details: message },
      { status: 500 }
    )
  }
}
