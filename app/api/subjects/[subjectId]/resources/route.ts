import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/subjects/[subjectId]/resources — all public resources for a subject
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params

    // Fetch subject details
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        semester: true,
      },
    })

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    // Fetch ALL public resources for this subject from ALL users
    const resources = await prisma.resource.findMany({
      where: {
        subjectId,
        isPublic: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Also fetch notes for this subject (legacy data)
    const notes = await prisma.note.findMany({
      where: { subjectId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      subject,
      resources,
      notes,
      totalCount: resources.length + notes.length,
    })
  } catch (error: unknown) {
    console.error("Subject resources error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch resources", details: message },
      { status: 500 }
    )
  }
}
