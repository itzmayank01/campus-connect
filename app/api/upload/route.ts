/**
 * @file route.ts — POST/GET /api/upload
 *
 * UPDATED FLOW (Phase 1 — HEIC + Textract at upload time):
 * 1. Accept file via multipart form data
 * 2. Auth check (Supabase)
 * 3. Process file: convert HEIC → JPEG if needed (via sharp)
 * 4. Upload processed file to S3
 * 5. Run AWS Textract to extract text (handles handwriting)
 * 6. Save Resource to DB with extractedText cached
 * 7. Return resource ID to frontend
 *
 * This eliminates re-downloading from S3 and re-extracting for each StudyLab tool.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { s3Client, buildS3Key, S3_BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { processUploadedFile, isImageFile } from "@/lib/imageProcessor";
import { extractTextFromImageBuffer, extractTextWithTextract } from "@/lib/textract";
import { extractText } from "@/lib/studyToolPipeline";

// POST /api/upload — upload file + extract text + create DB record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const fileItem = formData.get("file");
    const title = formData.get("title") as string;
    const subjectId = formData.get("subjectId") as string;
    const semester = formData.get("semester") as string;
    const type = (formData.get("type") as string) || "notes";

    if (!fileItem || !subjectId || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert to file/buffer
    const file = fileItem as File;
    const rawBuffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    const rawFilename = file.name;
    const rawMimeType = file.type || "application/octet-stream";
    const rawFileSize = file.size;

    // Find or create the user in our DB
    let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      const metaRole = user.user_metadata?.role;
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
          image: user.user_metadata?.avatar_url || null,
          role: metaRole === "faculty" ? "FACULTY" : "STUDENT",
          facultyId: metaRole === "faculty" ? (user.user_metadata?.faculty_id || null) : null,
        },
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    });

    const semesterNumber = parseInt(semester) || subject?.semester?.number || 1;

    // ── Process file: convert HEIC → JPEG if needed ───────────────────────
    let processedBuffer: Buffer = rawBuffer as Buffer;
    let processedMime = rawMimeType;
    let processedFilename = rawFilename;
    let originalMimeType: string | null = null;
    let wasConverted = false;

    try {
      const processed = await processUploadedFile(rawBuffer, rawFilename, rawMimeType);
      processedBuffer = processed.buffer;
      processedMime = processed.mimeType;
      wasConverted = processed.wasConverted;
      if (wasConverted) {
        originalMimeType = processed.originalType;
        // Update filename extension for S3 key
        processedFilename = rawFilename.replace(/\.[^.]+$/, `.${processed.extension}`);
      }
    } catch (err) {
      // If image processing fails, fall back to raw buffer (for file types not needing conversion)
      console.warn("[Upload] Image processing skipped:", err instanceof Error ? err.message : err);
    }

    // ── Upload to S3 ──────────────────────────────────────────────────────
    const s3Key = buildS3Key(dbUser.id, subjectId, processedFilename);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: processedBuffer,
        ContentType: processedMime,
        Metadata: {
          "original-filename": encodeURIComponent(rawFilename),
          "was-converted": wasConverted ? "true" : "false",
          ...(originalMimeType ? { "original-mime-type": originalMimeType } : {}),
        },
      })
    );

    // ── Extract text (Textract for images, pdf-parse/Textract for PDFs) ──
    let extractedText: string | null = null;
    let textExtracted = false;
    let textExtractedAt: Date | null = null;

    try {
      if (isImageFile(processedMime)) {
        // Image: use inline Textract AnalyzeDocument (no S3 needed)
        const result = await extractTextFromImageBuffer(processedBuffer, processedMime);
        extractedText = result.extractedText;
        textExtracted = true;
        textExtractedAt = new Date();
        console.log(
          `[Upload] Textract success — ${result.wordCount} words, ` +
          `confidence: ${result.confidence}%, ` +
          `handwriting: ${result.hasHandwriting}`
        );
      } else if (processedMime.includes("pdf")) {
        // PDF: use the existing two-pass pipeline (pdf-parse → Textract OCR fallback)
        const text = await extractText(processedBuffer, processedMime, s3Key);
        if (text && text.trim().length > 10) {
          extractedText = text;
          textExtracted = true;
          textExtractedAt = new Date();
          console.log(`[Upload] PDF text extracted — ${text.length} chars`);
        }
      } else if (processedMime.includes("word") || processedMime.includes("docx")) {
        // DOCX: use mammoth via the existing pipeline
        const text = await extractText(processedBuffer, processedMime);
        if (text && text.trim().length > 10) {
          extractedText = text;
          textExtracted = true;
          textExtractedAt = new Date();
          console.log(`[Upload] DOCX text extracted — ${text.length} chars`);
        }
      }
    } catch (err) {
      console.error(
        "[Upload] Text extraction failed (resource will be saved without text):",
        err instanceof Error ? err.message : err
      );
    }

    const resourceTypeMap: Record<string, string> = {
      notes: "NOTES",
      question_papers: "QUESTION_PAPERS",
      videos: "VIDEOS",
      reference: "REFERENCE",
      syllabus: "SYLLABUS",
    };

    // ── Create the Resource record in DB ──────────────────────────────────
    const resource = await prisma.resource.create({
      data: {
        uploaderId: dbUser.id,
        s3Key,
        originalFilename: title || rawFilename,
        fileSize: rawFileSize,
        mimeType: processedMime,
        originalMimeType: originalMimeType,
        subjectId,
        semester: semesterNumber,
        resourceType: (resourceTypeMap[type] || "NOTES") as never,
        isPublic: true,
        uploaderRole: dbUser.role === "FACULTY" ? "faculty" : "student",
        resourceUrl: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
        // Text extraction fields
        extractedText,
        textExtracted,
        textExtractedAt,
      },
      include: { subject: true },
    });

    // ── Leaderboard / Streak / Activity Hooks ─────────────────────────────
    try {
      const actDate = new Date();
      actDate.setHours(0, 0, 0, 0);

      const currentStreak = await prisma.userStreak.findUnique({ where: { userId: dbUser.id } });
      const currentScore = (currentStreak?.flameScore || 0) + 5;
      let flameLevel = "Starter Flame";
      if (currentScore >= 500) flameLevel = "Legend Flame";
      else if (currentScore >= 300) flameLevel = "Inferno";
      else if (currentScore >= 150) flameLevel = "Raging Flame";
      else if (currentScore >= 50) flameLevel = "Growing Flame";

      await prisma.userStreak.upsert({
        where: { userId: dbUser.id },
        update: { flameScore: currentScore, flameLevel },
        create: { userId: dbUser.id, flameScore: currentScore, flameLevel },
      });

      await prisma.activityEvent.create({
        data: {
          userId: dbUser.id,
          eventType: "UPLOAD",
          pointsEarned: 5,
          activityDate: new Date(),
        },
      });

      const daily = await prisma.dailyActivity.findUnique({
        where: { userId_activityDate: { userId: dbUser.id, activityDate: actDate } },
      });

      if (daily) {
        await prisma.dailyActivity.update({
          where: { id: daily.id },
          data: {
            uploadCount: { increment: 1 },
            pointsFromUploads: { increment: 5 },
            totalPointsToday: { increment: 5 },
          },
        });
      } else {
        await prisma.dailyActivity.create({
          data: {
            userId: dbUser.id,
            activityDate: actDate,
            uploadCount: 1,
            pointsFromUploads: 5,
            totalPointsToday: 5,
          },
        });
      }
    } catch (e) {
      console.warn("Failed to safely update streaks/points logic during upload", e);
    }

    return NextResponse.json({
      success: true,
      noteId: resource.id,
      fileUrl: resource.resourceUrl,
      textExtracted,
      ...(extractedText ? { wordCount: extractedText.split(/\s+/).length } : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upload error:", message);

    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}

// GET /api/upload — list current user's uploads (both s3 and youtube)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json([]);
    }

    const resources = await prisma.resource.findMany({
      where: { uploaderId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: { subject: true },
    });

    // Map to legacy expected format for frontend upload page seamlessly
    const mappedResources = resources.map((res) => {
      let format = "UNK";
      if (res.mimeType === "youtube") {
        format = "YT";
      } else if (res.s3Key) {
        format = res.s3Key.split(".").pop()?.toUpperCase() || "UNK";
      }

      const typeMap: Record<string, string> = {
        NOTES: "notes",
        QUESTION_PAPERS: "question_papers",
        VIDEOS: "videos",
        REFERENCE: "reference",
        SYLLABUS: "syllabus",
      };

      return {
        id: res.id,
        title: res.originalFilename || res.youtubeTitle || "Untitled",
        type: typeMap[res.resourceType] || "notes",
        format,
        fileUrl: res.resourceUrl,
        fileSize: (res.fileSize ? (res.fileSize / (1024 * 1024)).toFixed(2) : "0") + " MB",
        downloads: res.downloadCount,
        createdAt: res.createdAt,
        subject: res.subject,
        mimeType: res.mimeType,
        textExtracted: res.textExtracted,
      };
    });

    return NextResponse.json(mappedResources);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 });
  }
}
