/**
 * POST /api/video-tools/[videoId]/[tool]
 * GET  /api/video-tools/[videoId]/[tool]
 *
 * Tool slugs:
 *   full-summary      → FULL_SUMMARY
 *   section-summaries → SECTION_SUMMARIES
 *   study-report      → STUDY_REPORT
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { truncateTranscript } from "@/lib/youtube";
import { VideoToolType } from "@/lib/generated/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const TOOL_MAP: Record<string, VideoToolType> = {
  "full-summary": "FULL_SUMMARY",
  "section-summaries": "SECTION_SUMMARIES",
  "study-report": "STUDY_REPORT",
};

// ── Prompts per tool ──────────────────────────────────────────────────────────

const PROMPTS: Record<VideoToolType, string> = {
  FULL_SUMMARY: `You write concise, accurate summaries of educational video transcripts.
Output ONLY valid JSON. No markdown fences. No preamble.

{
  "title": "string — 3-7 word summary title",
  "duration_summary": "string — e.g. '45-minute lecture on...'",
  "summary": "string — 3-5 paragraph summary of the entire video",
  "key_points": ["string — 8-12 most important takeaways, each max 20 words"],
  "topics_covered": ["string — list of subject topics discussed"],
  "recommended_for": "string — who should watch this and why"
}

Be specific. Use concepts from the transcript. No vague generalities.
OUTPUT ONLY VALID JSON.`,

  SECTION_SUMMARIES: `You identify and summarise distinct sections of an educational video transcript.
Output ONLY valid JSON. No markdown fences. No preamble.

{
  "title": "string",
  "section_count": number,
  "sections": [
    {
      "section_number": 1,
      "title": "string — section topic (3-6 words)",
      "approximate_position": "string — e.g. 'First 10 minutes'",
      "summary": "string — 2-4 sentences summarising this section",
      "key_concepts": ["string — 2-4 key ideas from this section"],
      "important_for_exam": boolean
    }
  ],
  "overall_structure": "string — how the video is organised"
}

Identify 4-8 logical sections based on topic shifts in the content.
Mark sections as important_for_exam if they cover core curriculum concepts.
OUTPUT ONLY VALID JSON.`,

  STUDY_REPORT: `You create structured study reports from educational video transcripts.
Output ONLY valid JSON. No markdown fences. No preamble.

{
  "title": "string",
  "subject_area": "string",
  "summary": {
    "overview": "string — what this video teaches (2-3 sentences)",
    "learning_outcomes": ["string — 3-5 things you'll know after watching"]
  },
  "key_concepts": [
    {
      "term": "string",
      "definition": "string (max 50 words)",
      "timestamp_hint": "string or null — e.g. 'explained around the 15-minute mark'"
    }
  ],
  "formulas_or_rules": [
    { "name": "string", "expression": "string", "context": "string" }
  ],
  "study_questions": ["string — 5 exam-style questions based on the content"],
  "further_reading": ["string — 3-5 related topics to explore"]
}

key_concepts: 6-10 items. formulas_or_rules: [] if none present.
OUTPUT ONLY VALID JSON.`,
};

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string; tool: string }> }
) {
  const { videoId, tool } = await params;

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

  const toolType = TOOL_MAP[tool];
  if (!toolType) {
    return NextResponse.json(
      {
        error: `Unknown tool: ${tool}. Valid: ${Object.keys(TOOL_MAP).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Find video — must belong to user
  const video = await prisma.video.findFirst({
    where: { id: videoId, userId },
  });

  if (!video)
    return NextResponse.json({ error: "Video not found" }, { status: 404 });

  let effectiveTranscript = video.transcript ?? "";
  if (effectiveTranscript.trim().length < 100) {
    effectiveTranscript = "[No transcript available. Please perform the requested generation based strictly on your general knowledge about the video title and subject matter.]";
  }

  // Cache check — return immediately if already generated
  const existing = await prisma.videoStudyTool.findUnique({
    where: {
      userId_videoId_type: { userId, videoId, type: toolType },
    },
  });

  if (existing?.status === "READY" && existing.outputJson) {
    return NextResponse.json({
      ...JSON.parse(existing.outputJson),
      cached: true,
    });
  }

  // Mark as processing (upsert: create if first time, update if retrying)
  const studyTool = await prisma.videoStudyTool.upsert({
    where: {
      userId_videoId_type: { userId, videoId, type: toolType },
    },
    create: {
      userId,
      videoId,
      type: toolType,
      status: "PROCESSING",
    },
    update: { status: "PROCESSING", errorMessage: null },
  });

  try {
    const preparedTranscript = truncateTranscript(effectiveTranscript);
    const systemPrompt = PROMPTS[toolType];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      stream: false,
      temperature: 0.6,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Video title: "${video.title}"\nChannel: ${video.channelName ?? "Unknown"}\n\nTranscript:\n${preparedTranscript}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parse JSON (strip fences if LLM wraps output)
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    await prisma.videoStudyTool.update({
      where: { id: studyTool.id },
      data: { status: "READY", outputJson: JSON.stringify(parsed) },
    });

    return NextResponse.json({ ...parsed, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";

    await prisma.videoStudyTool.update({
      where: { id: studyTool.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 500) },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET handler — check status of a video tool ────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string; tool: string }> }
) {
  const { videoId, tool } = await params;

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

  const toolType = TOOL_MAP[tool];
  if (!toolType)
    return NextResponse.json({ error: "Unknown tool" }, { status: 400 });

  const videoTool = await prisma.videoStudyTool.findUnique({
    where: {
      userId_videoId_type: {
        userId: dbUser.id,
        videoId,
        type: toolType,
      },
    },
  });

  if (!videoTool) return NextResponse.json({ status: "not_started" });

  return NextResponse.json({
    status: videoTool.status,
    output: videoTool.outputJson ? JSON.parse(videoTool.outputJson) : null,
    error: videoTool.errorMessage,
    createdAt: videoTool.createdAt,
  });
}
