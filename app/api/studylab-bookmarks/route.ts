/**
 * GET /api/studylab-bookmarks
 *
 * Returns the user's bookmarked + downloaded documents (Resources)
 * and all their saved YouTube videos — for the StudyLab content picker.
 *
 * Documents: uses existing ResourceBookmark + ResourceDownload tables.
 * Videos: queries the new Video table (all user's videos appear).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  if (!dbUser)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.id;

  // ── Documents: bookmarked OR downloaded resources ─────────────────────────

  // 1. Get bookmarked resource IDs
  const bookmarkedResourceIds = await prisma.resourceBookmark.findMany({
    where: { userId },
    select: { resourceId: true },
  });

  // 2. Get downloaded resource IDs
  const downloadedResourceIds = await prisma.resourceDownload.findMany({
    where: { userId },
    select: { resourceId: true },
  });

  // 3. Merge unique resource IDs
  const allResourceIds = [
    ...new Set([
      ...bookmarkedResourceIds.map((b) => b.resourceId),
      ...downloadedResourceIds.map((d) => d.resourceId),
    ]),
  ];

  // 4. Fetch resource details (only PDF/DOCX types that StudyLab supports)
  const documents =
    allResourceIds.length > 0
      ? await prisma.resource.findMany({
          where: {
            id: { in: allResourceIds },
            deletedAt: null,
            mimeType: {
              in: [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
                "text/plain",
              ],
            },
          },
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            createdAt: true,
            s3Key: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // ── Videos: all user's saved YouTube videos ───────────────────────────────

  const videos = await prisma.video.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      channelName: true,
      thumbnailUrl: true,
      youtubeId: true,
      transcript: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      title: d.originalFilename,
      fileType: d.mimeType,
      createdAt: d.createdAt,
      hasS3Key: Boolean(d.s3Key),
    })),
    videos: videos.map((v) => ({
      id: v.id,
      title: v.title,
      channelName: v.channelName,
      thumbnailUrl: v.thumbnailUrl,
      youtubeId: v.youtubeId,
      hasTranscript: Boolean(v.transcript && v.transcript.length > 50),
      createdAt: v.createdAt,
    })),
  });
}
