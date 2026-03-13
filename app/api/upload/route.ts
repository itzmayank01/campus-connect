import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getPresignedUploadUrl, buildS3Key, S3_BUCKET } from "@/lib/s3"

// POST /api/upload — generate presigned URL + create DB record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { filename, contentType, subjectId, title, type = "notes" } = body

    if (!filename || !contentType || !subjectId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, subjectId, title" },
        { status: 400 }
      )
    }

    // Find or create the user in our DB
    let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
        },
      })
    }

    // Build S3 key and get presigned URL
    const s3Key = buildS3Key(dbUser.id, subjectId, filename)
    const presignedUrl = await getPresignedUploadUrl(s3Key, contentType)

    // Create the note record in DB
    const format = filename.split(".").pop()?.toUpperCase() || "PDF"
    const note = await prisma.note.create({
      data: {
        title,
        type,
        format,
        fileUrl: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
        fileSize: "0",
        subjectId,
        uploadedById: dbUser.id,
      },
      include: { subject: true },
    })

    return NextResponse.json({
      presignedUrl,
      s3Key,
      noteId: note.id,
      fileUrl: note.fileUrl,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process upload", details: error.message }, { status: 500 })
  }
}

// GET /api/upload — list current user's uploads
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json([])
    }

    const notes = await prisma.note.findMany({
      where: { uploadedById: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { subject: true },
    })

    return NextResponse.json(notes)
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch uploads", details: error.message }, { status: 500 })
  }
}
