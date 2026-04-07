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

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    })

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let resolvedAvatarUrl = dbUser.avatarUrl || dbUser.image
    if (resolvedAvatarUrl && resolvedAvatarUrl.includes("amazonaws.com") && resolvedAvatarUrl.includes("avatars/")) {
      const parts = resolvedAvatarUrl.split("/")
      const s3Key = parts.slice(parts.indexOf("avatars")).join("/")
      resolvedAvatarUrl = `/api/avatar?key=${encodeURIComponent(s3Key)}`
      
      // Auto-heal DB silently
      prisma.user.update({
        where: { id: dbUser.id },
        data: { avatarUrl: resolvedAvatarUrl }
      }).catch(console.error)
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        user_id_display: dbUser.userIdDisplay,
        full_name: dbUser.name,
        username: dbUser.username,
        email: dbUser.email,
        avatar_url: resolvedAvatarUrl,
        semester: dbUser.semester,
        branch: dbUser.branch,
        bio: dbUser.bio,
        role: dbUser.role.toLowerCase(),
        created_at: dbUser.createdAt
      }
    })
  } catch (error: unknown) {
    console.error("Fetch me error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
