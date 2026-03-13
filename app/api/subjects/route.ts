import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/subjects — list all subjects
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        semesterId: true,
      },
    })
    return NextResponse.json(subjects)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch subjects", details: error.message },
      { status: 500 }
    )
  }
}
