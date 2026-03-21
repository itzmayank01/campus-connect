import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { role, facultyId } = body

    if (!role || !["student", "faculty"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (role === "faculty" && !facultyId?.trim()) {
      return NextResponse.json({ error: "Faculty ID is required" }, { status: 400 })
    }

    const dbUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        role: role === "faculty" ? "FACULTY" : "STUDENT",
        facultyId: role === "faculty" ? facultyId : null,
      },
      create: {
        supabaseId: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        image: user.user_metadata?.avatar_url || null,
        role: role === "faculty" ? "FACULTY" : "STUDENT",
        facultyId: role === "faculty" ? facultyId : null,
      },
    })

    // Safely seed leaderboard row tracking
    await prisma.userStreak.upsert({
      where: { userId: dbUser.id },
      update: {},
      create: {
        userId: dbUser.id,
        currentStreak: 1,
        flameScore: 0,
        flameLevel: "Starter Flame"
      }
    })

    return NextResponse.json({
      success: true,
      role: dbUser.role.toLowerCase(),
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
