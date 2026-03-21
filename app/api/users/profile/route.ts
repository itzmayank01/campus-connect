import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, username, semester, branch, bio } = body

    // Validation
    const errors: Record<string, string> = {}
    
    // Check username pattern
    if (username !== undefined) {
      if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        errors.username = "Username must be 3-20 characters long and contain only letters, numbers, and underscores"
      } else {
        // Look up uniqueness
        const exist = await prisma.user.findFirst({
          where: {
            username: { equals: username, mode: 'insensitive' },
            supabaseId: { not: user.id }
          }
        })
        if (exist) errors.username = "Username taken"
      }
    }

    if (full_name !== undefined && (full_name.length < 2 || full_name.length > 100)) {
      errors.full_name = "Full name must be between 2 and 100 characters"
    }
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    // Build update payload safely
    const data: any = {}
    if (full_name !== undefined) data.name = full_name
    if (username !== undefined) data.username = username
    if (semester !== undefined) data.semester = parseInt(semester) || null
    if (branch !== undefined) data.branch = branch
    if (bio !== undefined) data.bio = bio

    const updatedUser = await prisma.user.update({
      where: { supabaseId: user.id },
      data,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        user_id_display: updatedUser.userIdDisplay,
        full_name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar_url: updatedUser.avatarUrl || updatedUser.image,
        semester: updatedUser.semester,
        branch: updatedUser.branch,
        bio: updatedUser.bio,
        role: updatedUser.role.toLowerCase(),
        created_at: updatedUser.createdAt
      }
    })
  } catch (error: any) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile", details: error.message }, { status: 500 })
  }
}
