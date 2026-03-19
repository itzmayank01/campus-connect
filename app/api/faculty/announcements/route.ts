import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const announcements = await prisma.facultyAnnouncement.findMany({
      where: { facultyId: dbUser.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        target: a.target,
        publishedAt: a.publishedAt?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error("Faculty announcements error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { title, message, target } = body

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const announcement = await prisma.facultyAnnouncement.create({
      data: {
        facultyId: dbUser.id,
        title: title.trim(),
        message: message.trim(),
        target: target || "all",
        publishedAt: new Date(),
      },
    })

    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        target: announcement.target,
        publishedAt: announcement.publishedAt?.toISOString(),
        createdAt: announcement.createdAt.toISOString(),
      },
    })
  } catch (err) {
    console.error("Faculty announcement post error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
