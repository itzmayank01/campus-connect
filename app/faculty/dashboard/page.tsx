"use client"

import { useState, useEffect } from "react"
import { Download, Heart, Star, Upload, BarChart3, CheckCircle, Megaphone, Loader2, Users, FileText, ArrowUpRight, Zap, TrendingUp } from "lucide-react"

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

const rankStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "Contributor":      { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", label: "Getting Started" },
  "Active Educator":  { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Growing Impact" },
  "Top Instructor":   { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", label: "High Engagement" },
  "Senior Educator":  { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", label: "Trusted Resource" },
  "Distinguished":    { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", label: "Top Contributor" },
}

function getRankStyle(rank: string) {
  return rankStyles[rank] || rankStyles["Contributor"]
}

function getNextRank(score: number) {
  if (score < 100) return { name: "Active Educator", target: 100 }
  if (score < 300) return { name: "Top Instructor", target: 300 }
  if (score < 600) return { name: "Senior Educator", target: 600 }
  if (score < 1000) return { name: "Distinguished", target: 1000 }
  return null
}

export default function FacultyDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    fetch("/api/faculty/overview").then((r) => r.json()).then((d) => setData(d)).catch(() => { }).finally(() => setLoading(false))
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

      {/* ═══ IMPACT SCORE CARD — Professional White ═══ */}
      <div className="impactCard rounded-2xl bg-white" style={{
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        padding: "28px 32px",
      }}>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1px_180px_1px_1fr_1px_320px] items-center gap-0">

          {/* ── COL 1: Faculty Rank ── */}
          <div className="pr-6">
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#94A3B8", textTransform: "uppercase" as const, marginBottom: 6 }}>Faculty Rank</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>{d.facultyRank}</p>
            <div className="mt-2 inline-flex items-center rounded-full" style={{
              background: getRankStyle(d.facultyRank).bg,
              border: `1px solid ${getRankStyle(d.facultyRank).border}`,
              borderLeft: `3px solid ${getRankStyle(d.facultyRank).text}`,
              padding: "4px 12px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: getRankStyle(d.facultyRank).text }}>{getRankStyle(d.facultyRank).label}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block" style={{ width: 1, height: "70%", alignSelf: "center", background: "#F1F5F9" }} />

          {/* ── COL 2: Impact Score ── */}
          <div className="px-6 py-4 md:py-0">
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#94A3B8", textTransform: "uppercase" as const, marginBottom: 6 }}>Impact Score</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>
              {d.impactScore === 0 ? "0" : animatedScore}
            </p>
            {d.impactScore > 0 ? (
              <div className="flex items-center gap-1 mt-1.5">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
                <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 500 }}>+{Math.min(d.impactScore, 24)} this week</span>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>— No activity yet</p>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block" style={{ width: 1, height: "70%", alignSelf: "center", background: "#F1F5F9" }} />

          {/* ── COL 3: Progress to Next Rank ── */}
          <div className="px-6 py-4 md:py-0">
            {nextRank ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{d.facultyRank}</span>
                  <span style={{ fontSize: 12, color: "#CBD5E1" }}>→</span>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{nextRank.name}</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 8, background: "#F1F5F9" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${progress}%`,
                    background: "#22C55E",
                    transition: "width 800ms ease-out",
                  }} />
                </div>
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>
                  {d.impactScore} of {nextRank.target} points to next rank
                </p>
                <p style={{ fontSize: 11, color: "#CBD5E1", marginTop: 6, fontStyle: "italic" }}>
                  Earn points through uploads, downloads and student engagement
                </p>
              </>
            ) : (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>Highest Rank Achieved</p>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>You are a Distinguished educator</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block" style={{ width: 1, height: "70%", alignSelf: "center", background: "#F1F5F9" }} />

          {/* ── COL 4: Stats 2×2 Grid ── */}
          <div className="grid grid-cols-2 gap-3 pl-6 pt-4 md:pt-0">
            {[
              { icon: Download, label: "DOWNLOADS", value: d.totalDownloads.toString(), color: "#3B82F6" },
              { icon: Heart, label: "LIKES", value: d.totalLikes.toString(), color: "#EF4444" },
              { icon: Star, label: "AVG RATING", value: d.averageRating.toFixed(1), sub: "out of 5.0", color: "#F59E0B" },
              { icon: Upload, label: "UPLOADS", value: d.totalUploads.toString(), color: "#8B5CF6" },
            ].map((s) => (
              <div key={s.label} className="rounded-[10px] transition-all duration-150 hover:bg-[#F0FDF4] hover:border-[#BBF7D0]" style={{
                background: "#F8FAFC", border: "1px solid #F1F5F9", padding: "12px 16px",
              }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon style={{ width: 14, height: 14, color: s.color }} />
                  <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.05em", color: "#94A3B8", textTransform: "uppercase" as const }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>{s.value}</p>
                {s.sub && <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{s.sub}</p>}
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
        .impactCard {
          animation: cardEnter 300ms ease-out both;
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
