import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/studyrooms/join - Join a room using an invite code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) return NextResponse.json({ error: "Invite code is required" }, { status: 400 })

    const room = await prisma.studyRoom.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { _count: { select: { members: true } } }
    })

    if (!room) return NextResponse.json({ error: "Room not found or invalid invite code" }, { status: 404 })

    // Check if user is already in the room
    const existingMember = await prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: dbUser.id } }
    })

    if (existingMember) {
      return NextResponse.json({ room, message: "Already joined" })
    }

    // Check room capacity (max 5)
    if (room._count.members >= 5) {
      return NextResponse.json({ error: "Room is full! Maximum 5 members allowed." }, { status: 403 })
    }

    // Add user to room
    await prisma.studyRoomMember.create({
      data: {
        roomId: room.id,
        userId: dbUser.id,
        role: 'member'
      }
    })

    return NextResponse.json({ room })
  } catch (error) {
    console.error("Error joining room:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
