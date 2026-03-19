"use client"

import { useState, useEffect } from "react"
import { Download, Heart, Star, Upload, BarChart3, CheckCircle, Megaphone, Loader2, TrendingUp, Users, FileText } from "lucide-react"

interface OverviewData {
  name: string
  impactScore: number
  facultyRank: string
  totalDownloads: number
  totalLikes: number
  averageRating: number
  studentsHelped: number
  totalUploads: number
  pendingVerifications: number
  recentActivity: Array<{
    id: string
    type: string
    message: string
    time: string
    points: number
  }>
  topMaterial: {
    name: string
    downloads: number
    likes: number
    rating: number
  } | null
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good Morning"
  if (h < 17) return "Good Afternoon"
  return "Good Evening"
}

function getRankEmoji(rank: string) {
  const map: Record<string, string> = {
    "Contributor": "📚",
    "Active Educator": "🌟",
    "Top Instructor": "🔥",
    "Elite Faculty": "💎",
    "Campus Legend": "👑",
  }
  return map[rank] || "📚"
}

function getNextRank(score: number) {
  if (score < 100) return { name: "Active Educator", target: 100 }
  if (score < 300) return { name: "Top Instructor", target: 300 }
  if (score < 600) return { name: "Elite Faculty", target: 600 }
  if (score < 1000) return { name: "Campus Legend", target: 1000 }
  return null
}

export default function FacultyDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/faculty/overview")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
      </div>
    )
  }

  const d = data || {
    name: "Faculty",
    impactScore: 0,
    facultyRank: "Contributor",
    totalDownloads: 0,
    totalLikes: 0,
    averageRating: 0,
    studentsHelped: 0,
    totalUploads: 0,
    pendingVerifications: 0,
    recentActivity: [],
    topMaterial: null,
  }

  const nextRank = getNextRank(d.impactScore)
  const progress = nextRank ? Math.min((d.impactScore / nextRank.target) * 100, 100) : 100

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1117]">
            {getGreeting()}, Prof. {d.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Your materials helped {d.studentsHelped} students this month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] px-3 py-1 text-xs font-bold">
            Faculty
          </span>
          <span className="text-sm text-[#94A3B8]">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </div>

      {/* Impact Score Hero Card */}
      <div
        className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a2e1a, #0d3d24, #0f4a2c)" }}
      >
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Crown */}
          <div className="text-[72px] animate-[crownGlow_2s_ease-in-out_infinite]">
            👑
          </div>

          {/* Score Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-[12px] text-[#86EFAC] uppercase tracking-wider font-medium">Impact Score</p>
            <p className="text-[64px] font-extrabold leading-none bg-gradient-to-r from-[#22C55E] to-[#86EFAC] bg-clip-text text-transparent">
              {d.impactScore}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/30 px-3 py-1 text-xs font-bold text-[#86EFAC]">
              {getRankEmoji(d.facultyRank)} {d.facultyRank}
            </span>
            {nextRank && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#86EFAC] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#86EFAC]/60 mt-1">
                  {nextRank.target - d.impactScore} pts to {nextRank.name}
                </p>
              </div>
            )}
          </div>

          {/* Stat Pills */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "↓", label: "Downloads", value: d.totalDownloads },
              { icon: "❤️", label: "Likes", value: d.totalLikes },
              { icon: "⭐", label: "Rating", value: d.averageRating.toFixed(1) },
              { icon: "📁", label: "Uploads", value: d.totalUploads },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <span>{s.icon}</span>
                <div>
                  <p className="text-[#86EFAC] font-bold text-sm leading-none">{s.value}</p>
                  <p className="text-[10px] text-[#86EFAC]/60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          @keyframes crownGlow {
            0%, 100% { filter: drop-shadow(0 0 8px #22C55E); }
            50% { filter: drop-shadow(0 0 24px #22C55E); }
          }
        `}</style>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Downloads", value: d.totalDownloads, icon: Download, color: "#4F8EF7", bg: "#EFF6FF" },
          { label: "Total Likes", value: d.totalLikes, icon: Heart, color: "#EF4444", bg: "#FEF2F2" },
          { label: "Avg Rating", value: `${d.averageRating.toFixed(1)} / 5.0`, icon: Star, color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Students Helped", value: d.studentsHelped, icon: Users, color: "#22C55E", bg: "#F0FDF4" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.bg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0F1117]">{s.value}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Upload Material", icon: Upload, href: "/dashboard/upload/new", color: "#22C55E" },
          { label: `Verify Uploads${d.pendingVerifications > 0 ? ` (${d.pendingVerifications})` : ""}`, icon: CheckCircle, href: "/faculty/verify", color: "#F59E0B" },
          { label: "View Analytics", icon: BarChart3, href: "/faculty/analytics", color: "#4F8EF7" },
          { label: "Post Announcement", icon: Megaphone, href: "/faculty/announcements", color: "#8B5CF6" },
        ].map((a) => (
          <a
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 rounded-2xl bg-white border border-[#F1F5F9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200 no-underline"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${a.color}15` }}>
              <a.icon className="h-5 w-5" style={{ color: a.color }} />
            </div>
            <span className="text-sm font-semibold text-[#0F1117]">{a.label}</span>
          </a>
        ))}
      </div>

      {/* Pending Verification Banner */}
      {d.pendingVerifications > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-[#FFF7ED] to-[#FFFBEB] border border-[#FDE68A] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-[#92400E]">
                {d.pendingVerifications} student upload{d.pendingVerifications !== 1 ? "s" : ""} need your review
              </p>
              <p className="text-xs text-[#B45309]">Help students by verifying their study materials</p>
            </div>
          </div>
          <a
            href="/faculty/verify"
            className="flex items-center gap-2 rounded-xl bg-[#22C55E] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#16A34A] transition-all no-underline"
          >
            Review Now →
          </a>
        </div>
      )}

      {/* Activity Feed & Top Material */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <div className="md:col-span-3 rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-bold text-[#0F1117] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {d.recentActivity.length > 0 ? d.recentActivity.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-[#F8FAFC] last:border-0">
                <span className="text-base">{a.type === "like" ? "❤️" : a.type === "download" ? "↓" : a.type === "rating" ? "⭐" : "✅"}</span>
                <p className="text-sm text-[#334155] flex-1">{a.message}</p>
                <span className="text-[11px] text-[#94A3B8]">{a.time}</span>
                <span className="text-[11px] text-[#22C55E] font-bold">+{a.points}pts</span>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] text-center py-6">No recent activity yet. Upload materials to get started!</p>
            )}
          </div>
        </div>

        {/* Top Material */}
        <div className="md:col-span-2 rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-bold text-[#0F1117] mb-4">Top Material This Week</h2>
          {d.topMaterial ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0FDF4]">
                <FileText className="h-8 w-8 text-[#22C55E]" />
              </div>
              <p className="text-sm font-semibold text-[#0F1117]">{d.topMaterial.name}</p>
              <div className="flex items-center gap-4 text-xs text-[#64748B]">
                <span>↓ {d.topMaterial.downloads}</span>
                <span>❤️ {d.topMaterial.likes}</span>
                <span>⭐ {d.topMaterial.rating.toFixed(1)}</span>
              </div>
              <a href="/faculty/analytics" className="text-sm font-semibold text-[#22C55E] hover:underline mt-2 no-underline">
                View Analytics →
              </a>
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8] text-center py-6">Upload your first material to see stats here!</p>
          )}
        </div>
      </div>
    </div>
  )
}
