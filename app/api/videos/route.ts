/**
 * POST /api/videos — Add a YouTube video to the user's library
 * GET  /api/videos — List user's saved videos
 *
 * Auth: Supabase SSR (matches existing Campus Connect pattern)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processYouTubeUrl, extractYouTubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

// ── POST — add video ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  if (!body?.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Extract YouTube ID
  const youtubeId = extractYouTubeId(body.url);
  if (!youtubeId) {
    return NextResponse.json(
      {
        error:
          "Invalid YouTube URL. Paste a link like: https://www.youtube.com/watch?v=...",
      },
      { status: 422 }
    );
  }

  // Check if already added by this user
  const existing = await prisma.video.findFirst({
    where: { userId, youtubeId },
  });
  if (existing) {
    return NextResponse.json({ video: existing, alreadyExists: true });
  }

  // Process the YouTube URL (metadata + transcript)
  let videoData;
  try {
    videoData = await processYouTubeUrl(body.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not fetch video";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Save to DB
  const video = await prisma.video.create({
    data: {
      userId,
      youtubeUrl: videoData.metadata.youtubeUrl,
      youtubeId: videoData.metadata.youtubeId,
      title: videoData.metadata.title,
      channelName: videoData.metadata.channelName,
      thumbnailUrl: videoData.metadata.thumbnailUrl,
      durationSeconds: videoData.metadata.durationSeconds,
      transcript: videoData.transcript,
      transcriptFetched: true,
      subject: body.subject ?? null,
      semester: body.semester ? parseInt(body.semester) : null,
    },
  });

  return NextResponse.json(
    {
      video,
      hasTranscript: videoData.hasTranscript,
      transcriptError: videoData.transcriptError,
    },
    { status: 201 }
  );
}

// ── GET — list user's videos ──────────────────────────────────────────────────

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

  const videos = await prisma.video.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      channelName: true,
      thumbnailUrl: true,
      youtubeId: true,
      youtubeUrl: true,
      durationSeconds: true,
      transcriptFetched: true,
      transcript: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ videos });
}
