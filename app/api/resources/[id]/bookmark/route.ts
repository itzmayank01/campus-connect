import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/resources/[id]/bookmark — toggle bookmark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if resource exists
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    // Toggle bookmark
    const existing = await prisma.resourceBookmark.findUnique({
      where: { resourceId_userId: { resourceId: id, userId: dbUser.id } },
    })

    if (existing) {
      // Remove bookmark
      await prisma.resourceBookmark.delete({ where: { id: existing.id } })
      await prisma.resource.update({
        where: { id },
        data: { bookmarkCount: { decrement: 1 } },
      })
      return NextResponse.json({ bookmarked: false })
    } else {
      // Add bookmark
      await prisma.resourceBookmark.create({
        data: { resourceId: id, userId: dbUser.id },
      })
      await prisma.resource.update({
        where: { id },
        data: { bookmarkCount: { increment: 1 } },
      })
      return NextResponse.json({ bookmarked: true })
    }
  } catch (error: unknown) {
    console.error("Bookmark error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to toggle bookmark", details: message },
      { status: 500 }
    )
  }
}

// GET /api/resources/[id]/bookmark — check if bookmarked
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ bookmarked: false })
    }

    const existing = await prisma.resourceBookmark.findUnique({
      where: { resourceId_userId: { resourceId: id, userId: dbUser.id } },
    })

    return NextResponse.json({ bookmarked: !!existing })
  } catch {
    return NextResponse.json({ bookmarked: false })
  }
}
