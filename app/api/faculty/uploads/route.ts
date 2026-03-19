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
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const uploads = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id, deletedAt: null },
      select: {
        id: true,
        originalFilename: true,
        fileSize: true,
        resourceType: true,
        semester: true,
        downloadCount: true,
        likeCount: true,
        averageRating: true,
        isVerified: true,
        verificationCount: true,
        rejectionReason: true,
        createdAt: true,
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      uploads: uploads.map((u) => ({
        id: u.id,
        originalFilename: u.originalFilename,
        fileSize: u.fileSize,
        resourceType: u.resourceType,
        subjectName: u.subject.name,
        semester: u.semester,
        downloadCount: u.downloadCount,
        likeCount: u.likeCount,
        averageRating: u.averageRating,
        isVerified: u.isVerified,
        verificationCount: u.verificationCount,
        rejectionReason: u.rejectionReason,
        createdAt: u.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error("Faculty uploads error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
