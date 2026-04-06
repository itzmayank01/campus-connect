import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/activity";

export async function GET() {
  try {
    // Optional: read time range from query parameters, currently limited
    const leaderboard = await getLeaderboard(20);
    return NextResponse.json({ leaderboard });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
