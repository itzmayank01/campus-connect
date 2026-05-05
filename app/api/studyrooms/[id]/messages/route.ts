import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/studyrooms/[id]/messages
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Check membership
    const member = await prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: params.id, userId: dbUser.id } }
    })
    if (!member) return NextResponse.json({ error: "Access Denied" }, { status: 403 })

    const messages = await prisma.studyRoomMessage.findMany({
      where: { roomId: params.id },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/studyrooms/[id]/messages
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Check membership
    const member = await prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: params.id, userId: dbUser.id } }
    })
    if (!member) return NextResponse.json({ error: "Access Denied" }, { status: 403 })

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const newMessage = await prisma.studyRoomMessage.create({
      data: {
        roomId: params.id,
        userId: dbUser.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } }
      }
    })

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
