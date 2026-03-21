import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/activity";

export async function GET() {
  try {
    // Optional: read time range from query parameters, currently limited
    const leaderboard = await getLeaderboard(20);
    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
