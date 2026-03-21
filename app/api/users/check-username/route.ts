import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json({ available: false }, { status: 400 })
    }

    // Check if taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        supabaseId: { not: user.id }
      }
    })

    return NextResponse.json({ available: !existing })
  } catch (error: any) {
    console.error("Username check error:", error)
    return NextResponse.json({ error: "Failed to check username", details: error.message }, { status: 500 })
  }
}
