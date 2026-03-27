/**
 * @file route.ts — POST /api/study-tools/generate
 *
 * Upgraded generation endpoint: uses open-notebook as the AI engine.
 * Keeps the same response contract as before (returns { toolId }) so the
 * UI (StudyLabPanel, StudyLabModal) requires zero changes.
 *
 * Flow:
 * 1. Auth check (Supabase)
 * 2. Validate tool type + resource
 * 3. Cache check — return immediately if READY and not refreshing
 * 4. Ensure open-notebook setup (transformation registration, lazy/idempotent)
 * 5. Get or create open-notebook notebook for this resource
 * 6. Upload PDF from S3 to open-notebook (reuses source if already uploaded)
 * 7. Apply the matching transformation
 * 8. Parse JSON, cache in DB, return toolId
 *
 * Falls back to the legacy pipeline if OPEN_NOTEBOOK_API_URL is not set.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { createClient }              from "@/lib/supabase/server";
import { StudyToolType }             from "@/lib/generated/prisma";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// open-notebook adapter
import {
  getOrCreateNotebook,
  uploadPDFAsSource,
  getSourcesForNotebook,
  applyTransformation,
  getOrCreateTransformation,
} from "@/lib/openNotebook";
import { TRANSFORMATIONS, StudyLabToolName } from "@/lib/studylabTransformations";
import { ensureStudyLabSetup }               from "@/lib/studylabSetup";

// Legacy pipeline fallback (used when open-notebook is not configured)
import { generateStudyTool } from "@/lib/generateStudyTool";

export const dynamic     = "force-dynamic";
export const maxDuration = 120; // 2 min — open-notebook AI calls can take ~60s

// ─── Tool mapping ─────────────────────────────────────────────────────────────

const TOOL_MAP: Partial<Record<StudyToolType, StudyLabToolName>> = {
  MIND_MAP:    "MIND_MAP",
  FLASHCARDS:  "FLASHCARDS",
  QUIZ:        "QUIZ",
  SLIDE_DECK:  "SLIDE_DECK",
  REPORT:      "REPORT",
  INFOGRAPHIC: "INFOGRAPHIC",
  DATA_TABLE:  "DATA_TABLE",
};

const VALID_TYPES = new Set<StudyToolType>([
  "AUDIO_OVERVIEW", "SLIDE_DECK", "MIND_MAP", "QUIZ",
  "FLASHCARDS", "REPORT", "INFOGRAPHIC", "DATA_TABLE",
]);

// ─── S3 client ────────────────────────────────────────────────────────────────

let _s3: S3Client | null = null;
function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

async function fetchPDFFromS3(s3Key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key:    s3Key,
  });
  const response = await getS3().send(cmd);
  if (!response.Body) throw new Error(`S3 returned empty body for key: ${s3Key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    return NextResponse.json({ error: "resourceId and type are required" }, { status: 400 });
  }

  const type      = body.type as StudyToolType;
  const isRefresh = body.isRefresh === true;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid tool type: ${type}` }, { status: 400 });
  }

  // ── Verify resource ──────────────────────────────────────────────────────────
  const resource = await prisma.resource.findUnique({ where: { id: body.resourceId } });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // ── Cache check ──────────────────────────────────────────────────────────────
  const existing = await prisma.studyTool.findUnique({
    where: { userId_resourceId_type: { userId, resourceId: body.resourceId, type } },
  });

  if (existing?.status === "READY" && !isRefresh) {
    return NextResponse.json({ toolId: existing.id, cached: true });
  }
  if ((existing?.status === "PROCESSING" || existing?.status === "PENDING") && !isRefresh) {
    return NextResponse.json({ toolId: existing.id, cached: false, running: true });
  }

  // ── Create / reset the tool row ──────────────────────────────────────────────
  let tool;
  if (existing) {
    tool = await prisma.studyTool.update({
      where: { id: existing.id },
      data:  { status: "PENDING", errorMessage: null, outputJson: null },
    });
  } else {
    tool = await prisma.studyTool.create({
      data: { userId, resourceId: body.resourceId, type, status: "PENDING" },
    });
  }

  // ── Route: open-notebook vs legacy ───────────────────────────────────────────
  // open-notebook runs ONLY locally (Docker not available on Vercel).
  // Vercel sets process.env.VERCEL = "1" automatically.
  // When on Vercel, always use the legacy Groq pipeline.
  const useOpenNotebook =
    !process.env.VERCEL &&
    Boolean(process.env.OPEN_NOTEBOOK_API_URL) &&
    TOOL_MAP[type] !== undefined &&
    type !== "AUDIO_OVERVIEW";

  if (!useOpenNotebook) {
    // ── Legacy pipeline (Groq direct) ──────────────────────────────────────────
    await generateStudyTool(tool.id, body.resourceId, type, isRefresh);

    const updated = await prisma.studyTool.findUnique({
      where: { id: tool.id }, select: { status: true, errorMessage: true },
    });
    if (updated?.status === "READY") {
      return NextResponse.json({ toolId: tool.id, cached: false });
    }
    return NextResponse.json(
      { error: updated?.errorMessage ?? "Generation failed" },
      { status: 500 }
    );
  }

  // ── open-notebook pipeline ────────────────────────────────────────────────────

  // Mark as PROCESSING so the UI shows a spinner immediately
  await prisma.studyTool.update({
    where: { id: tool.id },
    data:  { status: "PROCESSING" },
  });

  try {
    // Step 1: Ensure transformations registered in open-notebook (lazy, idempotent)
    await ensureStudyLabSetup();

    // Step 2: Get or create a dedicated notebook for this resource
    const notebook = await getOrCreateNotebook(body.resourceId, resource.originalFilename);

    // Step 3: Reuse existing source if already uploaded, else upload now
    const existingSourceId =
      (existing as (typeof existing & { openNotebookSrcId?: string | null }) | null)
        ?.openNotebookSrcId ?? null;

    let sourceId = existingSourceId;

    if (!sourceId) {
      // Check if notebook already has a source from a previous tool generation
      const existingSources = await getSourcesForNotebook(notebook.id);
      if (existingSources.length > 0) {
        sourceId = existingSources[0].id;
      } else if (resource.s3Key) {
        // Upload the PDF from S3 to open-notebook
        const pdfBuffer = await fetchPDFFromS3(resource.s3Key);
        const source    = await uploadPDFAsSource(
          notebook.id,
          pdfBuffer,
          resource.originalFilename
        );
        sourceId = source.id;
      } else {
        throw new Error("Resource has no S3 file to upload to open-notebook.");
      }

      // Persist IDs so future tool generations on this resource skip the upload step
      await prisma.studyTool.update({
        where: { id: tool.id },
        data:  { openNotebookNbId: notebook.id, openNotebookSrcId: sourceId },
      });
    }

    // Step 4: Apply the matching transformation
    const transformKey    = TOOL_MAP[type]!;
    const transformConfig = TRANSFORMATIONS[transformKey];
    const transformation  = await getOrCreateTransformation(
      transformConfig.name,
      transformConfig.title,
      transformConfig.prompt
    );

    const rawOutput = await applyTransformation(sourceId, transformation.id);

    // Step 5: Parse JSON (strip fences if LLM misbehaves)
    let parsed: unknown;
    try {
      const cleaned = rawOutput
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Tool output was not valid JSON (type=${type}).\n` +
        `First 300 chars: ${rawOutput.slice(0, 300)}`
      );
    }

    // Step 6: Cache result
    await prisma.studyTool.update({
      where: { id: tool.id },
      data: {
        status:     "READY",
        outputJson: JSON.stringify(parsed),
        generatedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({ toolId: tool.id, cached: false });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error(`[StudyLab/ON] Failed toolId=${tool.id} type=${type}:`, message);

    await prisma.studyTool.update({
      where: { id: tool.id },
      data:  { status: "FAILED", errorMessage: message.slice(0, 500) },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
