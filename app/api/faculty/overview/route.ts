import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, name: true, role: true, impactScore: true, facultyRank: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Get aggregated stats for this faculty's uploads
    const uploads = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id, deletedAt: null },
      select: { id: true, downloadCount: true, likeCount: true, averageRating: true, ratingCount: true, originalFilename: true },
    })

    const totalDownloads = uploads.reduce((s, u) => s + u.downloadCount, 0)
    const totalLikes = uploads.reduce((s, u) => s + u.likeCount, 0)
    const totalRatings = uploads.reduce((s, u) => s + u.ratingCount, 0)
    const averageRating = totalRatings > 0
      ? uploads.reduce((s, u) => s + u.averageRating * u.ratingCount, 0) / totalRatings
      : 0

    // Unique students who downloaded
    const uniqueDownloaders = await prisma.resourceDownload.findMany({
      where: { resource: { uploaderId: dbUser.id } },
      select: { userId: true },
      distinct: ["userId"],
    })

    // Pending verifications (not uploaded by this faculty)
    const pendingVerifications = await prisma.resource.count({
      where: {
        isVerified: false,
        deletedAt: null,
        uploaderId: { not: dbUser.id },
        verifications: { none: { facultyId: dbUser.id } },
      },
    })

    // Top material
    const topMaterial = uploads.length > 0
      ? uploads.reduce((best, u) => u.downloadCount > best.downloadCount ? u : best, uploads[0])
      : null

    // Calculate impact score
    const subjectsCovered = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id, deletedAt: null },
      select: { subjectId: true },
      distinct: ["subjectId"],
    })
    const verifiedCount = await prisma.resource.count({
      where: { uploaderId: dbUser.id, isVerified: true, deletedAt: null },
    })

    const impactScore = totalDownloads * 2 + totalLikes * 5 + totalRatings * 4 + verifiedCount * 3 + subjectsCovered.length * 10

    let facultyRank = "Contributor"
    if (impactScore >= 1000) facultyRank = "Campus Legend"
    else if (impactScore >= 600) facultyRank = "Elite Faculty"
    else if (impactScore >= 300) facultyRank = "Top Instructor"
    else if (impactScore >= 100) facultyRank = "Active Educator"

    // Update user impact score
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { impactScore, facultyRank },
    })

    return NextResponse.json({
      name: dbUser.name || "Faculty",
      impactScore,
      facultyRank,
      totalDownloads,
      totalLikes,
      averageRating: Number(averageRating.toFixed(1)),
      studentsHelped: uniqueDownloaders.length,
      totalUploads: uploads.length,
      pendingVerifications,
      recentActivity: [],
      topMaterial: topMaterial ? {
        name: topMaterial.originalFilename,
        downloads: topMaterial.downloadCount,
        likes: topMaterial.likeCount,
        rating: topMaterial.averageRating,
      } : null,
    })
  } catch (err) {
    console.error("Faculty overview error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
