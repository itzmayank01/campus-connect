import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getPresignedDownloadUrl } from "@/lib/s3"

// GET /api/resources/[id]/download — generate presigned download URL
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

    // For YouTube resources, return the YouTube URL
    if (resource.mimeType === "youtube" && resource.resourceUrl) {
      return NextResponse.json({
        redirectUrl: resource.resourceUrl,
        type: "youtube",
      })
    }

    // For file resources, generate presigned URL
    if (!resource.s3Key) {
      return NextResponse.json({ error: "No file associated with this resource" }, { status: 404 })
    }

    const downloadUrl = await getPresignedDownloadUrl(resource.s3Key)

    // Increment download count
    await prisma.resource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })

    // Record download
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (dbUser) {
      try {
        await prisma.resourceDownload.create({
          data: {
            resourceId: id,
            userId: dbUser.id,
          },
        })
      } catch {
        // Ignore duplicate download records
      }
    }

    return NextResponse.json({ downloadUrl, type: "file" })
  } catch (error: any) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL", details: error.message },
      { status: 500 }
    )
  }
}
