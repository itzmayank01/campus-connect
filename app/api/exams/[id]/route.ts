import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    await (prisma as any).exam.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Failed to delete exam:", error)
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 })
  }
}
