/**
 * @file route.ts
 * @description
 * POST /api/study-tools/generate
 *
 * A synchronous generation endpoint for StudyLab tools.
 * Unlike /api/study-tools (which uses after() for background jobs),
 * this endpoint runs generation INLINE and returns when done.
 *
 * Used by the frontend as a direct generation call —
 * the response includes the resulting toolId once ready.
 * The frontend polls /api/study-tools/[id] for the full output.
 *
 * Timeout: 60s (Next.js default for local dev; Vercel Pro: 300s)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateStudyTool } from "@/lib/generateStudyTool";
import { StudyToolType } from "@/lib/generated/prisma";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

const VALID_TYPES = new Set<StudyToolType>([
  "AUDIO_OVERVIEW", "SLIDE_DECK", "MIND_MAP", "QUIZ",
  "FLASHCARDS", "REPORT", "INFOGRAPHIC", "DATA_TABLE",
]);

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = dbUser.id;

  // ── Validate body ────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body?.resourceId || !body?.type) {
    return NextResponse.json(
      { error: "resourceId and type are required" },
      { status: 400 }
    );
  }

  const type = body.type as StudyToolType;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid tool type: ${type}` }, { status: 400 });
  }

  // ── Verify resource ──────────────────────────────────────────────────────────
  const resource = await prisma.resource.findUnique({ where: { id: body.resourceId } });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // ── Cache check: if already READY, return existing toolId immediately ────────
  const existing = await prisma.studyTool.findUnique({
    where: { userId_resourceId_type: { userId, resourceId: body.resourceId, type } },
  });

  if (existing?.status === "READY") {
    return NextResponse.json({ toolId: existing.id, cached: true });
  }

  // If already running, return the existing toolId so the frontend can poll
  if (existing?.status === "PROCESSING" || existing?.status === "PENDING") {
    return NextResponse.json({ toolId: existing.id, cached: false, running: true });
  }

  // ── Create or reset the tool row ─────────────────────────────────────────────
  let tool;
  if (existing?.status === "FAILED") {
    tool = await prisma.studyTool.update({
      where: { id: existing.id },
      data:  { status: "PENDING", errorMessage: null, outputJson: null },
    });
  } else {
    tool = await prisma.studyTool.create({
      data: { userId, resourceId: body.resourceId, type, status: "PENDING" },
    });
  }

  // ── Run generation synchronously ─────────────────────────────────────────────
  // This is the key difference from /api/study-tools — we await inline.
  // The request stays open (~10–30s), then returns the toolId once ready.
  await generateStudyTool(tool.id, body.resourceId, type);

  // Fetch updated status
  const updated = await prisma.studyTool.findUnique({
    where: { id: tool.id },
    select: { status: true, errorMessage: true },
  });

  if (updated?.status === "READY") {
    return NextResponse.json({ toolId: tool.id, cached: false });
  }

  // Generation failed
  return NextResponse.json(
    { error: updated?.errorMessage ?? "Generation failed" },
    { status: 500 }
  );
}
