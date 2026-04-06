import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { resourceId } = await request.json();
    if (!resourceId) return NextResponse.json({ error: "Resource ID missing" }, { status: 400 });

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

    // Check if already liked
    const existingLike = await prisma.resourceLike.findUnique({
      where: { resourceId_likedByUserId: { resourceId, likedByUserId: dbUser.id } },
    });

    if (existingLike) {
      // Unlike
      await prisma.resourceLike.delete({ where: { id: existingLike.id } });
      await prisma.resource.update({
        where: { id: resourceId },
        data: { likeCount: { decrement: 1 } },
      });
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await prisma.resourceLike.create({
        data: { resourceId, likedByUserId: dbUser.id },
      });
      await prisma.resource.update({
        where: { id: resourceId },
        data: { likeCount: { increment: 1 } },
      });

      // Award points to the UPLOADER
      if (resource.uploaderId !== dbUser.id) {
        await recordActivity(
          resource.uploaderId,
          "LIKE_RECEIVED",
          resourceId,
          "RESOURCE",
          dbUser.id
        );
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
