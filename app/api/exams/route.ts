import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/exams — list upcoming exams
export async function GET() {
  try {
    const now = new Date()
    const exams = await (prisma as any).exam.findMany({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      take: 10,
      include: { subject: true, semester: true },
    })
    return NextResponse.json(exams)
  } catch (error: any) {
    return NextResponse.json({ error: "Exam table not available yet. Run prisma db push first.", details: error.message }, { status: 500 })
  }
}

// POST /api/exams — create a new exam
// Body: { name, subjectId, semesterId, date, type }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subjectId, semesterId, date, type = "endterm" } = body

    if (!name || !subjectId || !semesterId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, subjectId, semesterId, date" },
        { status: 400 }
      )
    }

    const exam = await (prisma as any).exam.create({
      data: {
        name,
        subjectId,
        semesterId,
        date: new Date(date),
        type,
      },
      include: { subject: true, semester: true },
    })

    return NextResponse.json(exam, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create exam", details: error.message }, { status: 500 })
  }
}
