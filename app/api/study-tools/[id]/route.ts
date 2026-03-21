/**
 * @file route.ts
 * @description
 * GET    /api/study-tools/[id]  — Fetch full tool with parsed outputJson
 * DELETE /api/study-tools/[id]  — Delete tool (forces regeneration)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const tool = await prisma.studyTool.findFirst({
    where: { id, userId: dbUser.id },
  });

  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse outputJson before sending
  const response = {
    ...tool,
    output: tool.outputJson ? JSON.parse(tool.outputJson) : null,
    outputJson: undefined,
  };

  return NextResponse.json(response);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  await prisma.studyTool.deleteMany({
    where: { id, userId: dbUser.id },
  });

  return NextResponse.json({ deleted: true });
}
