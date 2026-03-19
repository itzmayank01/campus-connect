import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { s3Client, buildS3Key, S3_BUCKET } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"

// POST /api/upload — generate presigned URL + create DB record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const fileItem = formData.get("file")
    const title = formData.get("title") as string
    const subjectId = formData.get("subjectId") as string
    const semester = formData.get("semester") as string
    const type = (formData.get("type") as string) || "notes"

    if (!fileItem || !subjectId || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Convert to file/buffer
    const file = fileItem as File
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name
    const contentType = file.type || "application/octet-stream"
    const fileSize = file.size

    // Find or create the user in our DB
    let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      const metaRole = user.user_metadata?.role; // "student" or "faculty"
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
          image: user.user_metadata?.avatar_url || null,
          role: metaRole === "faculty" ? "FACULTY" : "STUDENT",
          facultyId: metaRole === "faculty" ? (user.user_metadata?.faculty_id || null) : null,
        },
      })
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    })

    const semesterNumber = parseInt(semester) || subject?.semester?.number || 1
    
    // Upload Server-Side (bypasses CORS)
    const s3Key = buildS3Key(dbUser.id, subjectId, filename)
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    const resourceTypeMap: Record<string, string> = {
      notes: "NOTES",
      question_papers: "QUESTION_PAPERS",
      videos: "VIDEOS",
      reference: "REFERENCE",
    }

    // Create the Resource record in DB
    const resource = await prisma.resource.create({
      data: {
        uploaderId: dbUser.id,
        s3Key,
        originalFilename: title || filename,
        fileSize: fileSize,
        mimeType: contentType,
        subjectId,
        semester: semesterNumber,
        resourceType: (resourceTypeMap[type] || "NOTES") as any,
        isPublic: true,
        uploaderRole: dbUser.role === "FACULTY" ? "faculty" : "student",
        resourceUrl: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
      },
      include: { subject: true },
    })

    return NextResponse.json({
      success: true,
      noteId: resource.id, // mapped exactly to avoid breaking client API expectations
      fileUrl: resource.resourceUrl,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process upload", details: error.message }, { status: 500 })
  }
}

// GET /api/upload — list current user's uploads (both s3 and youtube)
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

    const resources = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { subject: true },
    })

    // Map to legacy expected format for frontend upload page seamlessly
    const mappedResources = resources.map(res => {
      let format = "UNK"
      if (res.mimeType === "youtube") {
        format = "YT"
      } else if (res.s3Key) {
        format = res.s3Key.split(".").pop()?.toUpperCase() || "UNK"
      }
      
      const typeMap: Record<string, string> = {
        NOTES: "notes",
        QUESTION_PAPERS: "question_papers",
        VIDEOS: "videos",
        REFERENCE: "reference",
      }

      return {
        id: res.id,
        title: res.originalFilename || res.youtubeTitle || "Untitled",
        type: typeMap[res.resourceType] || "notes",
        format,
        fileUrl: res.resourceUrl,
        fileSize: (res.fileSize ? (res.fileSize / (1024*1024)).toFixed(2) : "0") + " MB",
        downloads: res.downloadCount,
        createdAt: res.createdAt,
        subject: res.subject,
        mimeType: res.mimeType
      }
    })

    return NextResponse.json(mappedResources)
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch uploads", details: error.message }, { status: 500 })
  }
}
