"use client"

import { useState, useEffect } from "react"
import { Download, Heart, Star, Upload, BarChart3, CheckCircle, Megaphone, Loader2, Users, FileText, ArrowUpRight, Zap } from "lucide-react"

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
    id: string; type: string; message: string; time: string; points: number
  }>
  topMaterial: { name: string; downloads: number; likes: number; rating: number } | null
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good Morning"
  if (h < 17) return "Good Afternoon"
  return "Good Evening"
}

function getRankEmoji(rank: string) {
  const m: Record<string, string> = { "Contributor": "📚", "Active Educator": "🌟", "Top Instructor": "🔥", "Elite Faculty": "💎", "Campus Legend": "👑" }
  return m[rank] || "📚"
}

function getNextRank(score: number) {
  if (score < 100) return { name: "Active Educator", target: 100, emoji: "🌟" }
  if (score < 300) return { name: "Top Instructor", target: 300, emoji: "🔥" }
  if (score < 600) return { name: "Elite Faculty", target: 600, emoji: "💎" }
  if (score < 1000) return { name: "Campus Legend", target: 1000, emoji: "👑" }
  return null
}

export default function FacultyDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    fetch("/api/faculty/overview").then((r) => r.json()).then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Animated counter
  useEffect(() => {
    if (!data) return
    const target = data.impactScore
    if (target === 0) return
    let current = 0
    const step = Math.max(1, Math.floor(target / 60))
    const timer = setInterval(() => {
      current += step
      if (current >= target) { current = target; clearInterval(timer) }
      setAnimatedScore(current)
    }, 16)
    return () => clearInterval(timer)
  }, [data])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>

  const d = data || { name: "Faculty", impactScore: 0, facultyRank: "Contributor", totalDownloads: 0, totalLikes: 0, averageRating: 0, studentsHelped: 0, totalUploads: 0, pendingVerifications: 0, recentActivity: [], topMaterial: null }
  const nextRank = getNextRank(d.impactScore)
  const progress = nextRank ? Math.min((d.impactScore / nextRank.target) * 100, 100) : 100

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#0F1117]">{getGreeting()}, Prof. {d.name?.split(" ")[0]}! 👋</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Your materials helped <span className="font-semibold text-[#22C55E]">{d.studentsHelped}</span> students</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] px-3 py-1 text-xs font-bold">👨‍🏫 Faculty</span>
          <span className="text-sm text-[#94A3B8] hidden md:block">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      </div>

      {/* ═══ IMPACT SCORE HERO CARD — Premium Glassmorphism ═══ */}
      <div className="relative rounded-[20px] overflow-hidden" style={{
        background: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #15803d 100%)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid rgba(34,197,94,0.2)",
      }}>
        {/* Background radial glow overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(34,197,94,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74,222,128,0.1) 0%, transparent 40%)",
        }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
          {/* Crown with pulse glow */}
          <div className="shrink-0">
            <div className="text-[80px] leading-none" style={{
              animation: "crownPulse 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 12px rgba(34,197,94,0.6))",
            }}>👑</div>
          </div>

          {/* Score + Rank */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-[12px] font-semibold tracking-[0.15em] uppercase" style={{ color: "#86EFAC" }}>Impact Score</p>
            <p className="text-[72px] font-extrabold leading-none mt-1" style={{
              background: "linear-gradient(135deg, #4ADE80, #86EFAC, #FFFFFF)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {d.impactScore === 0 ? "0" : animatedScore}
            </p>

            {/* Rank Badge */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{
              background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)",
            }}>
              <span className="text-base">{getRankEmoji(d.facultyRank)}</span>
              <span className="text-sm font-bold" style={{ color: "#86EFAC" }}>{d.facultyRank}</span>
            </div>

            {/* Progress to next rank */}
            {nextRank && (
              <div className="mt-4 max-w-xs mx-auto md:mx-0">
                <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "rgba(134,239,172,0.6)" }}>
                  <span>{d.impactScore} / {nextRank.target}</span>
                  <span>{nextRank.emoji} {nextRank.name}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #22C55E, #4ADE80, #86EFAC)",
                    boxShadow: "0 0 12px rgba(34,197,94,0.5)",
                  }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: "rgba(134,239,172,0.4)" }}>
                  {nextRank.target - d.impactScore} points to unlock {nextRank.name}
                </p>
              </div>
            )}
          </div>

          {/* Stat grid inside hero */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {[
              { icon: "↓", label: "Downloads", value: d.totalDownloads },
              { icon: "❤️", label: "Likes", value: d.totalLikes },
              { icon: "⭐", label: "Rating", value: d.averageRating.toFixed(1) },
              { icon: "📁", label: "Uploads", value: d.totalUploads },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                backdropFilter: "blur(8px)",
              }}>
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-[15px] font-bold leading-none" style={{ color: "#E2E8F0" }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(134,239,172,0.5)" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ STAT CARDS — Elevated Design ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Downloads", value: d.totalDownloads.toLocaleString(), icon: Download, color: "#4F8EF7", bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", iconBg: "#DBEAFE", trend: "+12%" },
          { label: "Total Likes", value: d.totalLikes.toLocaleString(), icon: Heart, color: "#EF4444", bg: "linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)", iconBg: "#FEE2E2", trend: "+8%" },
          { label: "Avg Rating", value: `${d.averageRating.toFixed(1)} ★`, icon: Star, color: "#F59E0B", bg: "linear-gradient(135deg, #FFFBEB 0%, #FDE68A 100%)", iconBg: "#FEF3C7", trend: "4.5→5.0" },
          { label: "Students Helped", value: d.studentsHelped.toLocaleString(), icon: Users, color: "#22C55E", bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", iconBg: "#DCFCE7", trend: "+24%" },
        ].map((s) => (
          <div key={s.label} className="group rounded-2xl border border-[#F1F5F9] p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default"
            style={{ background: s.bg }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110" style={{ background: s.iconBg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}15` }}>
                {s.trend}
              </span>
            </div>
            <p className="text-[26px] font-extrabold text-[#0F1117] leading-none">{s.value}</p>
            <p className="text-[11px] text-[#64748B] mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ QUICK ACTIONS — Premium Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Upload Material", icon: Upload, href: "/faculty/upload", color: "#22C55E", emoji: "📤" },
          { label: `Verify Uploads${d.pendingVerifications > 0 ? ` (${d.pendingVerifications})` : ""}`, icon: CheckCircle, href: "/faculty/verify", color: "#F59E0B", emoji: "✅" },
          { label: "View Analytics", icon: BarChart3, href: "/faculty/analytics", color: "#4F8EF7", emoji: "📊" },
          { label: "Announcement", icon: Megaphone, href: "/faculty/announcements", color: "#8B5CF6", emoji: "📢" },
        ].map((a) => (
          <a key={a.label} href={a.href}
            className="group flex flex-col items-center gap-3 rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 no-underline text-center">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110" style={{ background: `${a.color}12` }}>
              <span className="text-2xl">{a.emoji}</span>
              {a.label.includes("(") && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-white text-[9px] font-bold animate-pulse">
                  {d.pendingVerifications}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-[#334155] group-hover:text-[#0F1117]">{a.label}</span>
          </a>
        ))}
      </div>

      {/* ═══ PENDING VERIFICATION BANNER ═══ */}
      {d.pendingVerifications > 0 && (
        <div className="rounded-2xl border border-[#FDE68A] p-5 flex items-center justify-between" style={{
          background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 50%, #FEF3C7 100%)",
        }}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7]">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#92400E]">{d.pendingVerifications} student upload{d.pendingVerifications !== 1 ? "s" : ""} need your review</p>
              <p className="text-xs text-[#B45309] mt-0.5">Help students by verifying their study materials</p>
            </div>
          </div>
          <a href="/faculty/verify"
            className="flex items-center gap-2 rounded-xl bg-[#22C55E] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#16A34A] transition-all shadow-lg shadow-[#22C55E]/20 no-underline group">
            Review Now <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      )}

      {/* ═══ ACTIVITY + TOP MATERIAL ═══ */}
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0F1117]">Recent Activity</h2>
            <Zap className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="space-y-2">
            {d.recentActivity.length > 0 ? d.recentActivity.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#F8FAFC] transition-colors border-b border-[#F8FAFC] last:border-0">
                <span className="text-base">{a.type === "like" ? "❤️" : a.type === "download" ? "⬇️" : a.type === "rating" ? "⭐" : "✅"}</span>
                <p className="text-sm text-[#334155] flex-1">{a.message}</p>
                <span className="text-[11px] text-[#94A3B8]">{a.time}</span>
                <span className="text-[11px] text-[#22C55E] font-bold bg-[#F0FDF4] px-2 py-0.5 rounded-full">+{a.points}</span>
              </div>
            )) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFC]"><Upload className="h-6 w-6 text-[#CBD5E1]" /></div>
                <p className="text-sm text-[#94A3B8]">No activity yet</p>
                <a href="/faculty/upload" className="text-xs text-[#22C55E] font-semibold hover:underline no-underline">Upload your first material →</a>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0F1117]">🏆 Top Material</h2>
          </div>
          {d.topMaterial ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)" }}>
                <FileText className="h-8 w-8 text-[#22C55E]" />
              </div>
              <p className="text-sm font-semibold text-[#0F1117]">{d.topMaterial.name}</p>
              <div className="flex items-center gap-4 text-xs text-[#64748B]">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {d.topMaterial.downloads}</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {d.topMaterial.likes}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {d.topMaterial.rating.toFixed(1)}</span>
              </div>
              <a href="/faculty/analytics" className="flex items-center gap-1 text-sm font-semibold text-[#22C55E] hover:underline mt-2 no-underline">
                View Full Analytics <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFC]"><FileText className="h-6 w-6 text-[#CBD5E1]" /></div>
              <p className="text-sm text-[#94A3B8]">Upload materials to see your top performer here!</p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes crownPulse {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(34,197,94,0.6)) drop-shadow(0 0 24px rgba(34,197,94,0.3)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(74,222,128,0.8)) drop-shadow(0 0 40px rgba(74,222,128,0.4)); transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
