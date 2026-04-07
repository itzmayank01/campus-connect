import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

function extractYouTubeInfo(url: string): { type: "video" | "playlist"; videoId?: string; playlistId?: string } | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace("www.", "")

    // Playlist URL
    if (parsed.searchParams.get("list")) {
      return {
        type: "playlist",
        playlistId: parsed.searchParams.get("list") || undefined,
        videoId: parsed.searchParams.get("v") || undefined,
      }
    }

    // Standard watch URL
    if ((hostname === "youtube.com" || hostname === "m.youtube.com") && parsed.searchParams.get("v")) {
      return { type: "video", videoId: parsed.searchParams.get("v") || undefined }
    }

    // Short URL
    if (hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1)
      if (videoId) return { type: "video", videoId }
    }

    // Embed URL
    if (hostname === "youtube.com" && parsed.pathname.startsWith("/embed/")) {
      const videoId = parsed.pathname.split("/embed/")[1]
      if (videoId) return { type: "video", videoId }
    }

    return null
  } catch {
    return null
  }
}

// POST /api/resources/youtube — save a YouTube resource
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { url, title, subjectId, semester, type = "videos" } = body

    if (!url || !title || !subjectId) {
      return NextResponse.json(
        { error: "Missing required fields: url, title, subjectId" },
        { status: 400 }
      )
    }

    // Validate YouTube URL
    const ytInfo = extractYouTubeInfo(url)
    if (!ytInfo) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      )
    }

    // Find or create user in DB
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

    // Fetch YouTube metadata via oEmbed
    let youtubeTitle = title
    let youtubeThumbnail = ""
    let youtubeChannel = ""

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      )
      if (oembedRes.ok) {
        const oembed = await oembedRes.json()
        youtubeTitle = oembed.title || title
        youtubeThumbnail = oembed.thumbnail_url || ""
        youtubeChannel = oembed.author_name || ""
      }
    } catch {
      // oEmbed failed, use provided title
    }

    // Get subject to find semester number
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    })

    const semesterNumber = semester || subject?.semester?.number || 1

    // Map type string to ResourceType enum
    const resourceTypeMap: Record<string, string> = {
      notes: "NOTES",
      question_papers: "QUESTION_PAPERS",
      videos: "VIDEOS",
      reference: "REFERENCE",
      syllabus: "SYLLABUS",
    }

    const resource = await prisma.resource.create({
      data: {
        uploaderId: dbUser.id,
        s3Key: null,
        originalFilename: youtubeTitle,
        fileSize: 0,
        mimeType: "youtube",
        subjectId,
        semester: semesterNumber,
        resourceType: (resourceTypeMap[type] || "VIDEOS") as any,
        isPublic: true,
        resourceUrl: url,
        resourceUrlType: ytInfo.type === "playlist" ? "youtube_playlist" : "youtube_video",
        youtubeVideoId: ytInfo.videoId || null,
        youtubePlaylistId: ytInfo.playlistId || null,
        youtubeThumbnail,
        youtubeTitle,
        youtubeChannel,
      },
      include: {
        subject: true,
        uploader: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(resource)
  } catch (error: unknown) {
    console.error("YouTube resource error:", error)
    return NextResponse.json(
      { error: "Failed to save YouTube resource" },
      { status: 500 }
    )
  }
}
