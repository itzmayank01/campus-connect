import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: NextRequest, context: any) {
  try {
    const params = await context.params
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    await (prisma as any).exam.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to delete exam:", error.message || error)
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 })
  }
}
