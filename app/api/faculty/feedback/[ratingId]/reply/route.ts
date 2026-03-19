import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ratingId: string }> }
) {
  try {
    const { ratingId } = await params
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { reply } = body

    if (!reply?.trim()) {
      return NextResponse.json({ error: "Reply is required" }, { status: 400 })
    }

    const ratingReply = await prisma.ratingReply.create({
      data: {
        ratingId,
        facultyId: dbUser.id,
        reply: reply.trim(),
      },
    })

    return NextResponse.json({ success: true, reply: ratingReply })
  } catch (err) {
    console.error("Faculty reply error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
