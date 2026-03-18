import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/semesters/[semesterId]/subjects — all subjects with resource counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ semesterId: string }> }
) {
  try {
    const { semesterId } = await params

    // Try to find by ID first, then by semester number
    let semester = await prisma.semester.findUnique({
      where: { id: semesterId },
    })

    if (!semester) {
      const semNumber = parseInt(semesterId)
      if (!isNaN(semNumber)) {
        semester = await prisma.semester.findUnique({
          where: { number: semNumber },
        })
      }
    }

    if (!semester) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 })
    }

    const subjects = await prisma.subject.findMany({
      where: { semesterId: semester.id },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            notes: true,
            resources: true,
          },
        },
      },
    })

    // Also get resource breakdown per subject
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (subject) => {
        const resourceCounts = await prisma.resource.groupBy({
          by: ["resourceType"],
          where: {
            subjectId: subject.id,
            isPublic: true,
            deletedAt: null,
          },
          _count: { id: true },
        })

        const lastResource = await prisma.resource.findFirst({
          where: {
            subjectId: subject.id,
            isPublic: true,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })

        const typeCounts: Record<string, number> = {}
        resourceCounts.forEach((rc: any) => {
          typeCounts[rc.resourceType] = rc._count.id
        })

        return {
          ...subject,
          totalResources: (subject._count as any).notes + (subject._count as any).resources,
          notesCount: typeCounts["NOTES"] || 0,
          questionPapersCount: typeCounts["QUESTION_PAPERS"] || 0,
          videosCount: typeCounts["VIDEOS"] || 0,
          referenceCount: typeCounts["REFERENCE"] || 0,
          lastUpload: lastResource?.createdAt || null,
        }
      })
    )

    return NextResponse.json({
      semester,
      subjects: subjectsWithCounts,
      totalSubjects: subjects.length,
      totalResources: subjectsWithCounts.reduce((acc, s) => acc + s.totalResources, 0),
    })
  } catch (error: any) {
    console.error("Semester subjects error:", error)
    return NextResponse.json(
      { error: "Failed to fetch semester subjects", details: error.message },
      { status: 500 }
    )
  }
}
