import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const fileItem = formData.get("file")

    if (!fileItem) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const file = fileItem as File
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }
    
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const filename = `avatar_${timestamp}.${ext}`
    const s3Key = `avatars/${dbUser.id}/${filename}`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const avatarUrl = `/api/avatar?key=${encodeURIComponent(s3Key)}`

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { avatarUrl },
    })

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    })
  } catch (error: unknown) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
