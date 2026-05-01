/**
 * @file route.ts — POST /api/upload/moderate
 *
 * ANTI-GRAVITY CONTENT INSPECTION PIPELINE
 * ═════════════════════════════════════════
 *
 * Zero-tolerance, fail-closed upload moderation.
 * Every file is scanned by AI before being accepted.
 * If AI is down → upload REJECTED (not approved).
 * If ANY check fails → upload REJECTED immediately.
 *
 * Pipeline:
 *   1. Auth check
 *   2. File type gate (magic bytes + extension)
 *   3. Metadata & filename scan
 *   4. Upload to S3
 *   5. AI safety inspection (MANDATORY)
 *   6. AI relevance check (MANDATORY)
 *   7. Duplicate detection
 *   8. Save resource + audit log
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { s3Client, buildS3Key, S3_BUCKET } from "@/lib/s3"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { generateTags } from "@/lib/ai/tag-generator"
import { isAiConfigured } from "@/lib/anthropic"
import { extractTextFromBuffer } from "@/lib/pdf-extractor"
import {
  runFullInspection,
  type InspectionStep,
  type FullInspectionResult,
} from "@/lib/ai/content-inspector"

export const maxDuration = 60;

interface ModerationResult {
  passed: boolean
  steps: InspectionStep[]
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

// POST /api/upload/moderate — Anti-Gravity inspection pipeline
export async function POST(request: NextRequest) {
  const pipelineStart = Date.now()

  try {
    // ─── Auth check ──────────────────────────────────────────
    let user: any
    try {
      const supabase = await createClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json(
          { error: "Please log in again to upload files", steps: [] },
          { status: 401 }
        )
      }
      user = authUser
    } catch (authErr: unknown) {
      const msg = authErr instanceof Error ? authErr.message : "Unknown auth error"
      console.error("[Anti-Gravity] Auth error:", msg)
      if (msg.includes("expected pattern") || msg.includes("configuration missing")) {
        return NextResponse.json(
          { error: "Authentication service is not configured. Please contact the administrator.", steps: [] },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: "Authentication failed. Please log in again.", steps: [] },
        { status: 401 }
      )
    }

    // ─── Parse form data ─────────────────────────────────────
    const formData = await request.formData()
    const fileItem = formData.get("file")
    const title = formData.get("title") as string
    const subjectId = formData.get("subjectId") as string
    const semester = formData.get("semester") as string
    const type = (formData.get("type") as string) || "notes"

    if (!fileItem || !subjectId || !title) {
      return NextResponse.json(
        { error: "Missing required fields", steps: [] },
        { status: 400 }
      )
    }

    const file = fileItem as File
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name
    const contentType = file.type || "application/octet-stream"
    const fileSize = file.size

    // ─── Fetch subject info ──────────────────────────────────
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    })
    const semesterNumber = parseInt(semester) || subject?.semester?.number || 1

    // ─── Extract text for AI analysis ────────────────────────
    let extractedText = ""
    try {
      extractedText = await extractTextFromBuffer(buffer, filename, contentType)
      if (extractedText.length > 3000) {
        extractedText = extractedText.slice(0, 3000)
      }
    } catch {
      extractedText = `File: ${filename} (${contentType})`
    }

    // ═══════════════════════════════════════════════════════
    //   RUN ANTI-GRAVITY FULL INSPECTION (Steps 1-5)
    // ═══════════════════════════════════════════════════════
    console.log(`[Anti-Gravity] ▶ Starting inspection for "${filename}" (${contentType}, ${(fileSize / 1024).toFixed(0)} KB)`)

    const inspection: FullInspectionResult = await runFullInspection({
      buffer,
      filename,
      declaredMime: contentType,
      detectedMime: contentType,
      fileSize,
      extractedText,
      subjectName: subject?.name || "Unknown",
      subjectCode: subject?.code || "N/A",
      semester: semesterNumber,
      resourceType: type,
    })

    // ─── If ANY check failed → STOP immediately ─────────────
    if (!inspection.passed) {
      console.warn(`[Anti-Gravity] ✖ REJECTED "${filename}" — step: ${inspection.failedStep}, category: ${inspection.failCategory}`)

      // Build rejection info for relevance failures
      let rejection: ModerationResult["rejection"] = undefined
      if (inspection.failCategory === "irrelevant" && inspection.relevanceResult) {
        rejection = {
          subjectName: subject?.name || "Unknown",
          subjectCode: subject?.code || "N/A",
          detectedTopics: inspection.relevanceResult.detected_topics || [],
          reason: inspection.relevanceResult.reason || "Content mismatch",
        }
      }

      // Log the rejection
      try {
        let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
        if (dbUser) {
          await prisma.$executeRaw`
            INSERT INTO moderation_logs (id, uploader_id, filename, mime_type, file_size, passed, failed_step, fail_category, fail_reason, scan_results, processing_time_ms, created_at)
            VALUES (gen_random_uuid(), ${dbUser.id}, ${filename}, ${contentType}, ${fileSize}, false, ${inspection.failedStep || null}, ${inspection.failCategory || null}, ${inspection.failReason || null}, ${JSON.stringify({ safety: inspection.safetyResult, relevance: inspection.relevanceResult })}::jsonb, ${inspection.processingTimeMs}, NOW())
          `
        }
      } catch (logErr) {
        console.warn("[Anti-Gravity] Failed to write moderation log:", logErr)
      }

      return NextResponse.json({
        passed: false,
        steps: inspection.steps,
        reason: inspection.failReason || "Upload was rejected by content inspection",
        rejection,
      } as ModerationResult)
    }

    // ═══════════════════════════════════════════════════════
    //   ALL CHECKS PASSED — proceed with upload
    // ═══════════════════════════════════════════════════════

    const steps = inspection.steps

    // ─── Upload to S3 ────────────────────────────────────────
    const s3Step = steps.find(s => s.id === "upload_s3")
    if (s3Step) { s3Step.status = "running" }

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

    const s3Key = buildS3Key(dbUser.id, subjectId, filename)

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    if (s3Step) { s3Step.status = "done"; s3Step.message = "Uploaded to secure storage" }

    // ─── Duplicate Detection ─────────────────────────────────
    const dupStep = steps.find(s => s.id === "duplicate")
    if (dupStep) { dupStep.status = "running" }

    let duplicates: ModerationResult["duplicates"] = []

    try {
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
        if (dupStep) { dupStep.status = "done"; dupStep.message = `Found ${duplicates.length} similar resource(s)` }
      } else {
        if (dupStep) { dupStep.status = "done"; dupStep.message = "No duplicates found" }
      }
    } catch {
      if (dupStep) { dupStep.status = "done"; dupStep.message = "Duplicate check completed" }
    }

    // ─── Save Resource ───────────────────────────────────────
    const saveStep = steps.find(s => s.id === "save")
    if (saveStep) { saveStep.status = "running" }

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
        moderationPassed: true,
        needsReview: false,
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

    if (saveStep) { saveStep.status = "done"; saveStep.message = "Resource saved successfully" }

    // ─── Audit log (successful) ──────────────────────────────
    try {
      await prisma.$executeRaw`
        INSERT INTO moderation_logs (id, uploader_id, resource_id, filename, mime_type, file_size, passed, scan_results, ai_model_used, processing_time_ms, created_at)
        VALUES (gen_random_uuid(), ${dbUser.id}, ${resource.id}, ${filename}, ${contentType}, ${fileSize}, true, ${JSON.stringify({ safety: inspection.safetyResult, relevance: inspection.relevanceResult })}::jsonb, ${"gemini"}, ${inspection.processingTimeMs}, NOW())
      `
    } catch (logErr) {
      console.warn("[Anti-Gravity] Failed to write moderation log:", logErr)
    }

    const totalTime = Date.now() - pipelineStart
    console.log(`[Anti-Gravity] ✔ APPROVED "${filename}" in ${totalTime}ms — tags: [${aiTags.join(", ")}]`)

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
    console.error("[Anti-Gravity] Pipeline error:", error)
    const rawMessage = error instanceof Error ? error.message : "Unknown error"

    // Map known cryptic errors to user-friendly messages
    let userMessage = "Upload failed. Please try again."
    if (rawMessage.includes("expected pattern") || rawMessage.includes("configuration missing")) {
      userMessage = "Authentication service is not configured. Please contact the administrator."
    } else if (rawMessage.includes("Access Denied") || rawMessage.includes("credentials") || rawMessage.includes("InvalidAccessKeyId")) {
      userMessage = "File storage is not configured properly. Please contact the administrator."
    } else if (rawMessage.includes("AI_TIMEOUT")) {
      userMessage = "⛔ AI safety inspection timed out. Upload rejected — please try again."
    } else if (rawMessage.includes("ECONNREFUSED") || rawMessage.includes("fetch failed")) {
      userMessage = "Unable to reach required services. Please check your connection and try again."
    } else if (rawMessage.includes("body exceeded") || rawMessage.includes("too large") || rawMessage.includes("PayloadTooLargeError")) {
      userMessage = "File is too large. Please upload a smaller file (max 50 MB)."
    }

    return NextResponse.json(
      { error: userMessage, details: rawMessage, steps: [] },
      { status: 500 }
    )
  }
}
