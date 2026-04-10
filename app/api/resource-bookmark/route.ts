/**
 * POST /api/resource-bookmark — add a resource bookmark
 * DELETE /api/resource-bookmark — remove a resource bookmark
 *
 * Uses the existing ResourceBookmark table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  const body = await req.json().catch(() => null);
  if (!body?.resourceId) {
    return NextResponse.json(
      { error: "resourceId is required" },
      { status: 400 }
    );
  }

  // Upsert — idempotent
  const bookmark = await prisma.resourceBookmark.upsert({
    where: {
      resourceId_userId: {
        resourceId: body.resourceId,
        userId: dbUser.id,
      },
    },
    create: {
      resourceId: body.resourceId,
      userId: dbUser.id,
    },
    update: {},
  });

  // Increment bookmark count on resource (best-effort)
  await prisma.resource
    .update({
      where: { id: body.resourceId },
      data: { bookmarkCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({ bookmark }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  if (!body?.resourceId) {
    return NextResponse.json(
      { error: "resourceId is required" },
      { status: 400 }
    );
  }

  await prisma.resourceBookmark.deleteMany({
    where: {
      resourceId: body.resourceId,
      userId: dbUser.id,
    },
  });

  // Decrement bookmark count on resource (best-effort)
  await prisma.resource
    .update({
      where: { id: body.resourceId },
      data: { bookmarkCount: { decrement: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({ deleted: true });
}
