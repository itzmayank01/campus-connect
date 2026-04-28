import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  let streak = await prisma.userStreak.findUnique({ where: { userId: dbUser.id } })
  if (!streak) {
    streak = await prisma.userStreak.create({ data: { userId: dbUser.id } })
  }

  // Simple day/week reset logic
  const now = new Date()
  const lastActive = streak.lastActivityDate
  let updates: any = {}
  
  if (lastActive) {
    const isSameDay = now.toDateString() === lastActive.toDateString()
    if (!isSameDay) {
      updates.studyTimeToday = 0
    }
    
    // Very basic week reset (approximate: if more than 7 days, or different week number)
    // For simplicity, let's just reset if it's been > 7 days or it's a new Monday
    const msInDay = 24 * 60 * 60 * 1000
    if ((now.getTime() - lastActive.getTime()) > 7 * msInDay) {
      updates.studyTimeWeek = 0
    } else if (now.getDay() === 1 && lastActive.getDay() !== 1) { // Basic "reset on Monday" assumption
       updates.studyTimeWeek = 0
    }
  }

  if (Object.keys(updates).length > 0) {
    streak = await prisma.userStreak.update({
      where: { userId: dbUser.id },
      data: updates
    })
  }

  return NextResponse.json({
    studyTimeToday: streak.studyTimeToday,
    studyTimeWeek: streak.studyTimeWeek,
    weeklyGoal: streak.weeklyGoal
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { minutes } = await req.json()
    if (!minutes || typeof minutes !== "number") {
      return NextResponse.json({ error: "Invalid minutes" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    let streak = await prisma.userStreak.findUnique({ where: { userId: dbUser.id } })
    if (!streak) {
      streak = await prisma.userStreak.create({ data: { userId: dbUser.id } })
    }

    streak = await prisma.userStreak.update({
      where: { userId: dbUser.id },
      data: {
        studyTimeToday: { increment: minutes },
        studyTimeWeek: { increment: minutes },
        lastActivityDate: new Date()
      }
    })

    return NextResponse.json({
      studyTimeToday: streak.studyTimeToday,
      studyTimeWeek: streak.studyTimeWeek,
      weeklyGoal: streak.weeklyGoal
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
