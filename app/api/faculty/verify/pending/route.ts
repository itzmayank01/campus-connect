import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get("tab") || "pending"

    let resources
    if (tab === "pending") {
      resources = await prisma.resource.findMany({
        where: {
          isVerified: false,
          deletedAt: null,
          rejectionReason: null,
          uploaderId: { not: dbUser.id },
          verifications: { none: { facultyId: dbUser.id } },
        },
        select: {
          id: true,
          originalFilename: true,
          fileSize: true,
          resourceType: true,
          semester: true,
          createdAt: true,
          subject: { select: { name: true, code: true } },
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    } else if (tab === "verified") {
      const verifications = await prisma.resourceVerification.findMany({
        where: { facultyId: dbUser.id, action: "verified" },
        select: {
          resource: {
            select: {
              id: true, originalFilename: true, fileSize: true, resourceType: true,
              semester: true, createdAt: true,
              subject: { select: { name: true, code: true } },
              uploader: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      resources = verifications.map((v) => v.resource)
    } else {
      const verifications = await prisma.resourceVerification.findMany({
        where: { facultyId: dbUser.id, action: "rejected" },
        select: {
          resource: {
            select: {
              id: true, originalFilename: true, fileSize: true, resourceType: true,
              semester: true, createdAt: true,
              subject: { select: { name: true, code: true } },
              uploader: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      resources = verifications.map((v) => v.resource)
    }

    return NextResponse.json({
      resources: resources.map((r: any) => ({
        id: r.id,
        originalFilename: r.originalFilename,
        fileSize: r.fileSize,
        resourceType: r.resourceType,
        subjectName: r.subject.name,
        subjectCode: r.subject.code,
        semester: r.semester,
        uploaderName: r.uploader?.name || "Anonymous",
        uploaderId: r.uploader?.id,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    })
  } catch (err) {
    console.error("Faculty verify pending error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
