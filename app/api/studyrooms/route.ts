import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/studyrooms - List user's rooms
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const rooms = await prisma.studyRoom.findMany({
      where: {
        members: {
          some: { userId: dbUser.id }
        }
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: { user: { select: { name: true, image: true, email: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/studyrooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const body = await request.json()
    const { name, description } = body

    if (!name) return NextResponse.json({ error: "Room name is required" }, { status: 400 })

    // Generate a unique invite code (e.g., ABC-1234)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let inviteCode = ''
    for (let i = 0; i < 7; i++) {
      if (i === 3) inviteCode += '-'
      else inviteCode += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    const newRoom = await prisma.studyRoom.create({
      data: {
        name,
        description,
        inviteCode,
        creatorId: dbUser.id,
        members: {
          create: {
            userId: dbUser.id,
            role: 'owner'
          }
        }
      }
    })

    return NextResponse.json({ room: newRoom })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
