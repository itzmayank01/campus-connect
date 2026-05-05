import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/studyrooms/[id] - Get room details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const room = await prisma.studyRoom.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true } }
          }
        }
      }
    })

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

    // Check if user is a member
    const isMember = room.members.some(m => m.userId === dbUser.id)
    if (!isMember) return NextResponse.json({ error: "Access Denied" }, { status: 403 })

    return NextResponse.json({ room })
  } catch (error) {
    console.error("Error fetching room details:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
