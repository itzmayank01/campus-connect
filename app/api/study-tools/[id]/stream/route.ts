/**
 * @file route.ts
 * @description
 * GET /api/study-tools/[id]/stream
 * Server-Sent Events endpoint for real-time generation progress.
 * Polls DB status and emits progress events.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return new Response("User not found", { status: 404 });

  const { id } = await params;

  const tool = await prisma.studyTool.findFirst({
    where: { id, userId: dbUser.id },
  });
  if (!tool) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      if (tool.status === "READY") {
        send({ stage: "Done", percent: 100 });
        controller.close();
        return;
      }

      if (tool.status === "FAILED") {
        send({ error: tool.errorMessage ?? "Generation failed", percent: -1 });
        controller.close();
        return;
      }

      // Poll DB status every 2 seconds
      let attempts = 0;
      const MAX_ATTEMPTS = 120; // 4 minutes

      const interval = setInterval(async () => {
        attempts++;

        try {
          const updated = await prisma.studyTool.findUnique({
            where: { id },
            select: { status: true, errorMessage: true },
          });

          if (updated?.status === "READY") {
            send({ stage: "Done", percent: 100 });
            clearInterval(interval);
            controller.close();
            return;
          }

          if (updated?.status === "FAILED") {
            send({ error: updated.errorMessage ?? "Failed", percent: -1 });
            clearInterval(interval);
            controller.close();
            return;
          }

          if (updated?.status === "PROCESSING") {
            // Estimate progress based on time elapsed
            const estimatedPercent = Math.min(90, 10 + attempts * 2);
            send({ stage: "Processing your document...", percent: estimatedPercent });
          }

          // Keep-alive ping every ~20 seconds
          if (attempts % 10 === 0) {
            controller.enqueue(encoder.encode(": ping\n\n"));
          }

          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(interval);
            send({ error: "Generation timed out", percent: -1 });
            controller.close();
          }

        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 2000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
