import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { s3Client, buildS3Key, S3_BUCKET } from "@/lib/s3"
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { callAI, isAiConfigured } from "@/lib/anthropic"
import { generateTags } from "@/lib/ai/tag-generator"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"

export const maxDuration = 60;

// Allowed MIME types
const ALLOWED_MIMES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "video/mp4": [".mp4"],
}

interface ModerationStep {
  id: string
  label: string
  status: "pending" | "running" | "done" | "failed"
  message?: string
}

interface ModerationResult {
  passed: boolean
  steps: ModerationStep[]
  reason?: string
  tags?: string[]
  resourceId?: string
  duplicates?: Array<{
    id: string
    filename: string
    uploaderName: string
    downloadCount: number
    averageRating: number
  }>
  rejection?: {
    subjectName: string
    subjectCode: string
    detectedTopics: string[]
    reason: string
  }
}

// POST /api/upload/moderate — full moderation pipeline
export async function POST(request: NextRequest) {
  const steps: ModerationStep[] = [
    { id: "file_type", label: "File type verification", status: "pending" },
    { id: "upload_s3", label: "Uploading to secure storage", status: "pending" },
    { id: "relevance", label: "Checking content relevance", status: "pending" },
    { id: "safety", label: "Safety check", status: "pending" },
    { id: "duplicate", label: "Duplicate detection", status: "pending" },
    { id: "save", label: "Saving resource", status: "pending" },
  ]

  function updateStep(id: string, status: ModerationStep["status"], message?: string) {
    const step = steps.find((s) => s.id === id)
    if (step) {
      step.status = status
      if (message) step.message = message
    }
  }

  try {
    // ─── Auth check ──────────────────────────────────────────
    let user: any
    try {
      const supabase = await createClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: "Please log in again to upload files", steps },
          { status: 401 }
        )
      }
      user = authUser
    } catch (authErr: unknown) {
      const msg = authErr instanceof Error ? authErr.message : "Unknown auth error"
      console.error("[Moderation] Auth error:", msg)
      // The Supabase SDK throws "The string did not match the expected pattern"
      // when NEXT_PUBLIC_SUPABASE_URL is empty or malformed
      if (msg.includes("expected pattern") || msg.includes("configuration missing")) {
        return NextResponse.json(
          { error: "Authentication service is not configured. Please contact the administrator.", steps },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: "Authentication failed. Please log in again.", steps },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const fileItem = formData.get("file")
    const title = formData.get("title") as string
    const subjectId = formData.get("subjectId") as string
    const semester = formData.get("semester") as string
    const type = (formData.get("type") as string) || "notes"

    if (!fileItem || !subjectId || !title) {
      return NextResponse.json(
        { error: "Missing required fields", steps },
        { status: 400 }
      )
    }

    const file = fileItem as File
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name
    const contentType = file.type || "application/octet-stream"
    const fileSize = file.size
    const ext = "." + filename.split(".").pop()?.toLowerCase()

    // ─── STEP 1: File type validation ─────────────────────
    updateStep("file_type", "running")

    // Check via file-type library (deep MIME detection)
    let detectedMime = contentType
    try {
      const { fileTypeFromBuffer } = await import("file-type")
      const typeResult = await fileTypeFromBuffer(buffer)
      if (typeResult) {
        detectedMime = typeResult.mime
      }
    } catch {
      // file-type may not detect all types, fallback to content-type header
    }

    // Validate MIME is allowed
    const allowedExts = ALLOWED_MIMES[detectedMime] || ALLOWED_MIMES[contentType]
    if (!allowedExts) {
      updateStep("file_type", "failed", `File type "${detectedMime}" is not allowed`)
      return NextResponse.json({
        passed: false,
        steps,
        reason: `File type "${detectedMime}" is not allowed. Supported: PDF, ZIP, DOC, DOCX, PPT, PPTX, MP4`,
      } as ModerationResult)
    }

    // Check extension matches detected MIME
    if (!allowedExts.includes(ext) && detectedMime !== contentType) {
      updateStep("file_type", "failed", "File type mismatch detected")
      return NextResponse.json({
        passed: false,
        steps,
        reason: `File type mismatch: extension is "${ext}" but content is "${detectedMime}"`,
      } as ModerationResult)
    }

    updateStep("file_type", "done", "File type verified")

    // ─── STEP 2: Upload to S3 ──────────────────────────────
    updateStep("upload_s3", "running")

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

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    })

    const semesterNumber = parseInt(semester) || subject?.semester?.number || 1
    const s3Key = buildS3Key(dbUser.id, subjectId, filename)

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    updateStep("upload_s3", "done", "Uploaded to secure storage")

    // ─── STEP 3: AI Relevance Check ────────────────────────
    updateStep("relevance", "running")

    let extractedText = ""
    let relevanceResult: {
      is_relevant: boolean
      confidence: number
      reason: string
      detected_topics: string[]
      verdict: string
    } | null = null

    // Extract content for AI analysis
    try {
      extractedText = await extractTextFromBuffer(buffer, filename, contentType)
      if (extractedText.length > 2000) {
        extractedText = extractedText.slice(0, 2000)
      }
    } catch {
      extractedText = `File: ${filename} (${contentType})`
    }

    if (isAiConfigured() && extractedText.length > 20) {
      const relevanceResponse = await callAI(
        `You are an academic content moderator for an engineering college resource platform. Analyze if uploaded content is relevant to the specified academic subject. Respond ONLY with JSON: {"is_relevant": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation", "detected_topics": ["topic1", "topic2"], "verdict": "approved" | "rejected" | "review"}`,
        `Subject: ${subject?.name || "Unknown"} (${subject?.code || "N/A"})
Semester: ${semesterNumber}
Resource Type: ${type}
Filename: ${filename}

Content preview:
${extractedText}

Is this content relevant to the subject?`
      )

      if (relevanceResponse) {
        try {
          const cleaned = relevanceResponse.replace(/```json\n?|```\n?/g, "").trim()
          relevanceResult = JSON.parse(cleaned)
        } catch {}
      }
    }

    let moderationPassed = true
    let needsReview = false

    if (relevanceResult) {
      if (relevanceResult.confidence >= 0.8 && relevanceResult.is_relevant) {
        updateStep("relevance", "done", "Content verified as relevant")
      } else if (relevanceResult.confidence >= 0.6 && relevanceResult.is_relevant) {
        updateStep("relevance", "done", "Uploaded — pending quick review")
        needsReview = true
      } else {
        updateStep("relevance", "failed", relevanceResult.reason || "Content not relevant")
        // Return rejection but still allow (soft block — return info but don't delete S3 object)
        return NextResponse.json({
          passed: false,
          steps,
          reason: relevanceResult.reason || "Content doesn't appear relevant to the subject",
          rejection: {
            subjectName: subject?.name || "Unknown",
            subjectCode: subject?.code || "N/A",
            detectedTopics: relevanceResult.detected_topics || [],
            reason: relevanceResult.reason || "Content mismatch",
          },
        } as ModerationResult)
      }
    } else {
      // AI not configured — accept the content but inform the user
      updateStep("relevance", "done", "Content accepted (auto-approved)")
    }

    // ─── STEP 4: Safety Check ──────────────────────────────
    updateStep("safety", "running")

    if (isAiConfigured() && extractedText.length > 10) {
      const safetyResponse = await callAI(
        `You are a content safety moderator. Check if academic content contains harmful, inappropriate, dangerous, or sexually explicit material. Respond ONLY with JSON: {"is_safe": true/false, "flags": [], "severity": "none"|"low"|"medium"|"high", "action": "allow"|"warn"|"block"}`,
        `Check this content for harmful material: ${extractedText}`
      )

      if (safetyResponse) {
        try {
          const cleaned = safetyResponse.replace(/```json\n?|```\n?/g, "").trim()
          const safetyResult = JSON.parse(cleaned)

          if (safetyResult.severity === "medium" || safetyResult.severity === "high" || !safetyResult.is_safe) {
            updateStep("safety", "failed", "Content flagged for safety/inappropriate concerns")
            return NextResponse.json({
              passed: false,
              steps,
              reason: "This content was flagged as inappropriate and cannot be uploaded. If you believe this is a mistake, contact support.",
            } as ModerationResult)
          } else if (safetyResult.severity === "low") {
            updateStep("safety", "done", "Passed with warning flag")
            needsReview = true
          } else {
            updateStep("safety", "done", "Content is safe")
          }

          // Log safety result inline (resourceModeration table not in schema)
          console.log("Safety check result:", { isSafe: safetyResult.is_safe, severity: safetyResult.severity, flags: safetyResult.flags })
        } catch {
          updateStep("safety", "done", "Safety check completed")
        }
      }
    } else {
      updateStep("safety", "done", "Safety check passed (auto-approved)")
    }

    // ─── STEP 5: Duplicate Detection ───────────────────────
    updateStep("duplicate", "running")

    let duplicates: ModerationResult["duplicates"] = []

    try {
      // Use Prisma query with case-insensitive filename matching
      const similarResources = await prisma.resource.findMany({
        where: {
          subjectId,
          deletedAt: null,
          originalFilename: {
            contains: filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").split(" ").filter(w => w.length > 3)[0] || filename,
            mode: "insensitive",
          },
        },
        take: 3,
        include: {
          uploader: { select: { name: true, email: true } },
        },
      })

      if (similarResources.length > 0) {
        duplicates = similarResources.map((r) => ({
          id: r.id,
          filename: r.originalFilename,
          uploaderName: r.uploader.name || r.uploader.email.split("@")[0],
          downloadCount: r.downloadCount,
          averageRating: r.averageRating,
        }))
        updateStep("duplicate", "done", `Found ${duplicates.length} similar resource(s)`)
      } else {
        updateStep("duplicate", "done", "No duplicates found")
      }
    } catch {
      updateStep("duplicate", "done", "Duplicate check completed")
    }

    // ─── STEP 6: Save Resource ─────────────────────────────
    updateStep("save", "running")

    const resourceTypeMap: Record<string, string> = {
      notes: "NOTES",
      question_papers: "QUESTION_PAPERS",
      videos: "VIDEOS",
      reference: "REFERENCE",
      syllabus: "SYLLABUS",
    }

    // Generate AI tags
    let aiTags: string[] = []
    if (isAiConfigured()) {
      aiTags = await generateTags(
        subject?.name || "Unknown",
        filename,
        extractedText,
        type
      )
    }

    const resource = await prisma.resource.create({
      data: {
        uploaderId: dbUser.id,
        s3Key,
        originalFilename: title || filename,
        fileSize,
        mimeType: contentType,
        subjectId,
        semester: semesterNumber,
        resourceType: (resourceTypeMap[type] || "NOTES") as any,
        isPublic: true,
        resourceUrl: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
        moderationPassed,
        needsReview,
        aiTags,
      },
      include: { subject: true },
    })

    // Update Daily Activity for uploads (10 points per upload)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    await prisma.dailyActivity.upsert({
      where: {
        userId_activityDate: {
          userId: dbUser.id,
          activityDate: today
        }
      },
      create: {
        userId: dbUser.id,
        activityDate: today,
        pointsFromUploads: 10,
        totalPointsToday: 10,
        isPassiveDay: false
      },
      update: {
        pointsFromUploads: { increment: 10 },
        totalPointsToday: { increment: 10 },
        isPassiveDay: false
      }
    })

    updateStep("save", "done", "Resource saved successfully")

    return NextResponse.json({
      passed: true,
      steps,
      tags: aiTags,
      resourceId: resource.id,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      noteId: resource.id,
      fileUrl: resource.resourceUrl,
    } as ModerationResult & { noteId: string; fileUrl: string | null })
  } catch (error: unknown) {
    console.error("Moderation pipeline error:", error)
    const rawMessage = error instanceof Error ? error.message : "Unknown error"

    // Map known cryptic errors to user-friendly messages
    let userMessage = "Upload failed. Please try again."
    if (rawMessage.includes("expected pattern") || rawMessage.includes("configuration missing")) {
      userMessage = "Authentication service is not configured. Please contact the administrator."
    } else if (rawMessage.includes("Access Denied") || rawMessage.includes("credentials") || rawMessage.includes("InvalidAccessKeyId")) {
      userMessage = "File storage is not configured properly. Please contact the administrator."
    } else if (rawMessage.includes("AI_TIMEOUT")) {
      userMessage = "Content check timed out. Please try uploading again."
    } else if (rawMessage.includes("ECONNREFUSED") || rawMessage.includes("fetch failed")) {
      userMessage = "Unable to reach required services. Please check your connection and try again."
    } else if (rawMessage.includes("body exceeded") || rawMessage.includes("too large") || rawMessage.includes("PayloadTooLargeError")) {
      userMessage = "File is too large. Please upload a smaller file (max 50 MB)."
    }

    return NextResponse.json(
      { error: userMessage, details: rawMessage, steps },
      { status: 500 }
    )
  }
}
