"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  earned: boolean
  earnedAt?: string
  progress?: string
}

const allAchievements: Achievement[] = [
  { id: "first_upload", emoji: "📤", title: "First Upload", description: "First material uploaded", earned: false },
  { id: "100_downloads", emoji: "🌊", title: "100 Downloads", description: "Reached 100 total downloads", earned: false },
  { id: "1k_downloads", emoji: "💯", title: "1K Downloads", description: "1,000 total downloads across all uploads", earned: false },
  { id: "10k_downloads", emoji: "🔥", title: "10K Downloads", description: "10,000 total downloads", earned: false },
  { id: "most_loved", emoji: "❤️", title: "Most Loved", description: "Top likes this month", earned: false },
  { id: "subject_champion", emoji: "📚", title: "Subject Champion", description: "Most uploads in a single subject", earned: false },
  { id: "weekly_1", emoji: "🏆", title: "Weekly #1", description: "Ranked #1 for a week", earned: false },
  { id: "campus_legend", emoji: "👑", title: "Campus Legend", description: "1000+ impact score", earned: false },
  { id: "perfect_rating", emoji: "⭐", title: "Perfect Rating", description: "5.0 average with 10+ ratings", earned: false },
  { id: "mentor", emoji: "🎓", title: "Mentor", description: "Helped 500+ unique students", earned: false },
  { id: "verifier", emoji: "✅", title: "Verifier", description: "Verified 50+ student uploads", earned: false },
  { id: "consistent", emoji: "📅", title: "Consistent", description: "Uploaded every week for a month", earned: false },
]

export default function FacultyAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(allAchievements)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, fetch from API to get earned status
    // For now, show all as templates
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  const earned = achievements.filter((a) => a.earned)
  const unearned = achievements.filter((a) => !a.earned)

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1117]">Achievements</h1>
        <p className="text-sm text-[#64748B] mt-1">
          {earned.length} of {achievements.length} achievements earned
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl border p-5 text-center transition-all duration-200 ${
              a.earned
                ? "bg-white border-[#DCFCE7] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md"
                : "bg-[#F8FAFC] border-[#E2E8F0] opacity-60"
            }`}
          >
            <div className={`text-3xl mb-2 ${a.earned ? "" : "grayscale"}`}>{a.emoji}</div>
            <h3 className={`text-sm font-bold mb-1 ${a.earned ? "text-[#0F1117]" : "text-[#94A3B8]"}`}>
              {a.title}
            </h3>
            <p className={`text-[10px] leading-relaxed ${a.earned ? "text-[#64748B]" : "text-[#CBD5E1]"}`}>
              {a.description}
            </p>
            {a.earned && a.earnedAt && (
              <p className="text-[9px] text-[#22C55E] font-medium mt-2">
                Earned {new Date(a.earnedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </p>
            )}
            {!a.earned && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className="text-[9px] text-[#CBD5E1]">🔒 Locked</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
