import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const verifications = await prisma.resourceVerification.findMany({
      where: { resourceId: id, action: "verified" },
      select: {
        faculty: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      count: verifications.length,
      verifiedBy: verifications.map((v) => ({
        name: v.faculty.name || "Faculty",
        verifiedAt: v.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error("Resource verifications error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
