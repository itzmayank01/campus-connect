import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

    // Return the last 365 days of activity
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const activities = await prisma.dailyActivity.findMany({
      where: {
        userId: dbUser.id,
        activityDate: {
          gte: lastYear,
        },
      },
      orderBy: { activityDate: "asc" },
      select: {
        activityDate: true,
        totalPointsToday: true,
        isPassiveDay: true,
        pointsFromLogin: true,
        pointsFromUploads: true,
        pointsFromDownloads: true,
        pointsFromLikesReceived: true,
      },
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
