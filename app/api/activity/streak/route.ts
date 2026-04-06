import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getTodayActivity } from "@/lib/activity";

export async function GET(request: NextRequest) {
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

    const streak = await prisma.userStreak.findUnique({ where: { userId: dbUser.id } });
    const today = await getTodayActivity(dbUser.id);

    return NextResponse.json({
      streak: streak || {
        currentStreak: 0,
        longestStreak: 0,
        flameScore: 0,
        flameLevel: "Starter Flame",
      },
      today,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
