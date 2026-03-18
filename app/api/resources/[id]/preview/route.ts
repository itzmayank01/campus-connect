import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getPresignedDownloadUrl } from "@/lib/s3"

// GET /api/resources/[id]/preview — get preview URL
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

    const resource = await prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    // For YouTube resources, return embed URL
    if (resource.mimeType === "youtube") {
      let embedUrl = ""
      if (resource.youtubePlaylistId) {
        embedUrl = `https://www.youtube.com/embed/videoseries?list=${resource.youtubePlaylistId}`
      } else if (resource.youtubeVideoId) {
        embedUrl = `https://www.youtube.com/embed/${resource.youtubeVideoId}`
      }
      return NextResponse.json({
        previewUrl: embedUrl,
        type: "youtube",
        resource,
      })
    }

    // For PDF files, generate presigned URL for inline view
    if (!resource.s3Key) {
      return NextResponse.json({ error: "No file associated" }, { status: 404 })
    }

    const previewUrl = await getPresignedDownloadUrl(resource.s3Key)

    return NextResponse.json({
      previewUrl,
      type: resource.mimeType?.includes("pdf") ? "pdf" : "file",
      resource,
    })
  } catch (error: unknown) {
    console.error("Preview error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate preview URL", details: message },
      { status: 500 }
    )
  }
}
