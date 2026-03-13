import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getPresignedDownloadUrl, S3_BUCKET } from "@/lib/s3"

// GET /api/upload/download?noteId=xxx&action=view|download
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get("noteId")

    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 })
    }

    // Fetch the note from DB
    const note = await prisma.note.findUnique({ where: { id: noteId } })

    if (!note || !note.fileUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Extract the S3 key from the stored fileUrl
    // fileUrl format: https://{bucket}.s3.amazonaws.com/{key}
    const bucketPrefix = `https://${S3_BUCKET}.s3.amazonaws.com/`
    let s3Key = ""

    if (note.fileUrl.startsWith(bucketPrefix)) {
      s3Key = note.fileUrl.substring(bucketPrefix.length)
    } else {
      // Fallback: try to extract key after the bucket domain
      const url = new URL(note.fileUrl)
      s3Key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname
    }

    if (!s3Key) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 })
    }

    // Generate a presigned download URL (valid for 1 hour)
    const presignedUrl = await getPresignedDownloadUrl(s3Key)

    return NextResponse.json({ url: presignedUrl })
  } catch (error: any) {
    console.error("Download URL error:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL", details: error.message },
      { status: 500 }
    )
  }
}
