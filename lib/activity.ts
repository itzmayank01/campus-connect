import { prisma } from "./prisma";
import { ActivityType } from "@/lib/generated/prisma";

// Point mapping for different activity types
const ACTIVITY_POINTS: Record<ActivityType, number> = {
  LOGIN: 10,
  UPLOAD: 50,
  DOWNLOAD: 5,
  LIKE_RECEIVED: 10,
  BOOKMARK_RECEIVED: 5,
  RATING_RECEIVED: 15,
  FIRST_SUBJECT_UPLOAD: 100,
  STUDY_GOAL_MET: 30,
};

// Returns a flame level tag based on the user's total flame score
export function getFlameLevel(score: number): { emoji: string; label: string; color: string } {
  if (score >= 10000) return { emoji: "🌋", label: "Inferno", color: "text-purple-600" };
  if (score >= 5000) return { emoji: "🔥", label: "Blaze", color: "text-rose-600" };
  if (score >= 2000) return { emoji: "🔥", label: "Wildfire", color: "text-orange-600" };
  if (score >= 500) return { emoji: "✨", label: "Spark", color: "text-amber-500" };
  return { emoji: "🌱", label: "Starter Flame", color: "text-gray-500" };
}

// Records an activity, updates daily stats, and increments streak if applicable
export async function recordActivity(
  userId: string,
  eventType: ActivityType,
  referenceId?: string,
  referenceType?: string,
  triggeredByUserId?: string
) {
  const points = ACTIVITY_POINTS[eventType] || 0;
  const now = new Date();
  
  // Normalize date to mid-night (local or UTC, sticking to UTC for backend)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // 1. Create the activity event logging
  await prisma.activityEvent.create({
    data: {
      userId,
      eventType,
      pointsEarned: points,
      referenceId,
      referenceType,
      triggeredByUserId,
      activityDate: today,
    },
  });

  // 2. Upsert DailyActivity
  const dailyActivity = await prisma.dailyActivity.upsert({
    where: {
      userId_activityDate: {
        userId,
        activityDate: today,
      },
    },
    update: {
      totalPointsToday: { increment: points },
      pointsFromLogin: eventType === "LOGIN" ? { increment: points } : undefined,
      pointsFromUploads: eventType === "UPLOAD" ? { increment: points } : undefined,
      pointsFromDownloads: eventType === "DOWNLOAD" ? { increment: points } : undefined,
      pointsFromLikesReceived: eventType === "LIKE_RECEIVED" ? { increment: points } : undefined,
      pointsFromBookmarksReceived: eventType === "BOOKMARK_RECEIVED" ? { increment: points } : undefined,
      pointsFromRatingsReceived: eventType === "RATING_RECEIVED" ? { increment: points } : undefined,
      loginCount: eventType === "LOGIN" ? { increment: 1 } : undefined,
      uploadCount: eventType === "UPLOAD" ? { increment: 1 } : undefined,
      downloadCount: eventType === "DOWNLOAD" ? { increment: 1 } : undefined,
      likesReceivedCount: eventType === "LIKE_RECEIVED" ? { increment: 1 } : undefined,
      bookmarksReceivedCount: eventType === "BOOKMARK_RECEIVED" ? { increment: 1 } : undefined,
      ratingsReceivedCount: eventType === "RATING_RECEIVED" ? { increment: 1 } : undefined,
    },
    create: {
      userId,
      activityDate: today,
      totalPointsToday: points,
      pointsFromLogin: eventType === "LOGIN" ? points : 0,
      pointsFromUploads: eventType === "UPLOAD" ? points : 0,
      pointsFromDownloads: eventType === "DOWNLOAD" ? points : 0,
      pointsFromLikesReceived: eventType === "LIKE_RECEIVED" ? points : 0,
      pointsFromBookmarksReceived: eventType === "BOOKMARK_RECEIVED" ? points : 0,
      pointsFromRatingsReceived: eventType === "RATING_RECEIVED" ? points : 0,
      loginCount: eventType === "LOGIN" ? 1 : 0,
      uploadCount: eventType === "UPLOAD" ? 1 : 0,
      downloadCount: eventType === "DOWNLOAD" ? 1 : 0,
      likesReceivedCount: eventType === "LIKE_RECEIVED" ? 1 : 0,
      bookmarksReceivedCount: eventType === "BOOKMARK_RECEIVED" ? 1 : 0,
      ratingsReceivedCount: eventType === "RATING_RECEIVED" ? 1 : 0,
    },
  });

  // 3. Upsert UserStreak
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  
  if (!streak) {
    const level = getFlameLevel(points);
    await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        flameScore: points,
        flameLevel: level.label,
        pointsToday: points,
        pointsThisWeek: points,
        pointsThisMonth: points,
        pointsAllTime: points,
        lastActivityDate: now,
      },
    });
    return;
  }

  // Calculate Streak Logic
  let newCurrentStreak = streak.currentStreak;
  let newLongestStreak = streak.longestStreak;
  const lastActivityDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  const lastActivityDay = lastActivityDate 
    ? new Date(Date.UTC(lastActivityDate.getUTCFullYear(), lastActivityDate.getUTCMonth(), lastActivityDate.getUTCDate()))
    : null;

  if (!lastActivityDay) {
    newCurrentStreak = 1;
    newLongestStreak = 1;
  } else if (lastActivityDay.getTime() < today.getTime()) {
    const diffTime = Math.abs(today.getTime() - lastActivityDay.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Continuing the streak
      newCurrentStreak += 1;
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
    } else if (diffDays > 1) {
      // Streak broken (ignoring streak freezes logic for simplicity here)
      newCurrentStreak = 1;
    }
  }

  const newTotalScore = streak.flameScore + points;
  const level = getFlameLevel(newTotalScore);
  
  // Update streak document
  await prisma.userStreak.update({
    where: { userId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      flameScore: newTotalScore,
      flameLevel: level.label,
      pointsToday: dailyActivity.totalPointsToday,
      pointsThisWeek: { increment: points },
      pointsThisMonth: { increment: points },
      pointsAllTime: newTotalScore,
      lastActivityDate: now,
    },
  });
}

// Retrieves today's activity stats
export async function getTodayActivity(userId: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  const daily = await prisma.dailyActivity.findUnique({
    where: { userId_activityDate: { userId, activityDate: today } },
  });

  return daily || {
    totalPointsToday: 0,
    loginCount: 0,
    uploadCount: 0,
    downloadCount: 0,
    likesReceivedCount: 0,
  };
}

// Retrieves leaderboard
export async function getLeaderboard(limit = 10) {
  const users = await prisma.userStreak.findMany({
    take: limit,
    orderBy: { flameScore: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return users.map((streak, index) => ({
    rank: index + 1,
    userId: streak.userId,
    name: streak.user.name || streak.user.email.split("@")[0],
    image: streak.user.image,
    score: streak.flameScore,
    level: streak.flameLevel,
    streak: streak.currentStreak,
  }));
}
