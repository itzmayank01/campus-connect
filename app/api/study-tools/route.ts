/**
 * @file route.ts
 * @description
 * POST /api/study-tools   — Create a new StudyTool job (or return cached)
 * GET  /api/study-tools   — List all tools for a resource
 *
 * Architecture: Uses Next.js after() for background generation.
 * No BullMQ worker needed — fully compatible with Vercel serverless.
 */

import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateStudyTool } from "@/lib/generateStudyTool";
import { StudyToolType } from "@/lib/generated/prisma";

// Required for after() to work and for generation to have enough time
export const dynamic    = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel Pro allows up to 300s

const VALID_TYPES = new Set<StudyToolType>([
  "AUDIO_OVERVIEW", "SLIDE_DECK", "MIND_MAP", "QUIZ",
  "FLASHCARDS", "REPORT", "VIDEO_OVERVIEW", "INFOGRAPHIC", "DATA_TABLE",
]);

// ── POST ──────────────────────────────────────────────────────────────────────

/** Create a new study tool generation job or return cached result. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find our DB user by supabaseId
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = dbUser.id;

  const body = await req.json().catch(() => null);
  if (!body?.resourceId || !body?.type) {
    return NextResponse.json({ error: "resourceId and type are required" }, { status: 400 });
  }

  const type = body.type as StudyToolType;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid tool type: ${type}` }, { status: 400 });
  }

  // Verify resource exists (any user can use StudyLab on any resource)
  const resource = await prisma.resource.findUnique({ where: { id: body.resourceId } });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // ── Cache check ──
  const existing = await prisma.studyTool.findUnique({
    where: { userId_resourceId_type: { userId, resourceId: body.resourceId, type } },
  });

  // Already done → return immediately
  if (existing?.status === "READY") {
    return NextResponse.json({ toolId: existing.id, cached: true });
  }

  // Already running → let the SSE stream continue polling
  if (existing?.status === "PROCESSING" || existing?.status === "PENDING") {
    return NextResponse.json({ toolId: existing.id, cached: false });
  }

  // ── Create or reset the tool row ──
  let tool;
  if (existing?.status === "FAILED") {
    // Reset failed tool for retry
    tool = await prisma.studyTool.update({
      where: { id: existing.id },
      data:  { status: "PENDING", errorMessage: null, outputJson: null },
    });
  } else {
    tool = await prisma.studyTool.create({
      data: { userId, resourceId: body.resourceId, type, status: "PENDING" },
    });
  }

  // ── Kick off generation with after() ──────────────────────────────────────
  // after() schedules work to run AFTER the response is sent.
  // This is the correct Next.js pattern for background generation.
  after(() => generateStudyTool(tool.id, body.resourceId, type));

  return NextResponse.json({ toolId: tool.id, cached: false }, { status: 201 });
}

// ── GET ───────────────────────────────────────────────────────────────────────

/** List all study tools for a resource (without heavy outputJson). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const resourceId = req.nextUrl.searchParams.get("resourceId");
  if (!resourceId) {
    return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
  }

  const tools = await prisma.studyTool.findMany({
    where:   { userId: dbUser.id, resourceId },
    select:  {
      id: true, type: true, status: true,
      generatedAt: true, errorMessage: true,
      // Do NOT include outputJson here — it's large and not needed for the panel
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ tools });
}
