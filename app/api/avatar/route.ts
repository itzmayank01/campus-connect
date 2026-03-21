import { NextRequest, NextResponse } from "next/server"
import { getPresignedDownloadUrl } from "@/lib/s3"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 })
  }

  try {
    const presignedUrl = await getPresignedDownloadUrl(key)
    return NextResponse.redirect(presignedUrl)
  } catch (error) {
    return NextResponse.json({ error: "Failed to load avatar" }, { status: 500 })
  }
}
