import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/subjects — list all subjects with resource counts
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        semester: true,
        _count: {
          select: {
            notes: true,
            resources: true,
          },
        },
      },
    })

    const formattedSubjects = subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      semesterId: s.semesterId,
      semesterNumber: s.semester?.number,
      credits: s.credits,
      category: s.category,
      resourceCount: (s._count?.notes || 0) + (s._count?.resources || 0),
    }))

    return NextResponse.json(formattedSubjects)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch subjects", details: error.message },
      { status: 500 }
    )
  }
}
