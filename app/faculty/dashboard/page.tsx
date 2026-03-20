"use client"

import { useState, useEffect } from "react"
import { Download, Heart, Star, Upload, BarChart3, CheckCircle, Megaphone, Loader2, Users, FileText, ArrowUpRight, Zap, Trophy, FolderUp, Flame, Crown, Gem, BookOpen } from "lucide-react"

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

function getRankIcon(rank: string) {
  const map: Record<string, { icon: any; color: string }> = {
    "Contributor": { icon: BookOpen, color: "#4ADE80" },
    "Active Educator": { icon: Star, color: "#60A5FA" },
    "Top Instructor": { icon: Flame, color: "#FB923C" },
    "Elite Faculty": { icon: Gem, color: "#C084FC" },
    "Campus Legend": { icon: Crown, color: "#FBBF24" },
  }
  return map[rank] || map["Contributor"]
}

function getNextRank(score: number) {
  if (score < 100) return { name: "Active Educator", target: 100, icon: Star, color: "#60A5FA" }
  if (score < 300) return { name: "Top Instructor", target: 300, icon: Flame, color: "#FB923C" }
  if (score < 600) return { name: "Elite Faculty", target: 600, icon: Gem, color: "#C084FC" }
  if (score < 1000) return { name: "Campus Legend", target: 1000, icon: Crown, color: "#FBBF24" }
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

      {/* ═══ IMPACT SCORE HERO CARD ═══ */}
      <div className="heroCard relative rounded-[20px] overflow-hidden" style={{
        background: "linear-gradient(135deg, #052e16 0%, #064e23 30%, #065f2b 60%, #047857 100%)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid rgba(34,197,94,0.2)",
      }}>
        {/* L2 — Radial spotlight top-left */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 15% 50%, rgba(34,197,94,0.25) 0%, transparent 70%)" }} />
        {/* L3 — Radial spotlight top-right */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 60% at 85% 20%, rgba(74,222,128,0.12) 0%, transparent 60%)" }} />
        {/* L4 — Noise texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")" }} />
        {/* L5 — Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(134,239,172,0.6) 30%, rgba(74,222,128,0.8) 50%, rgba(134,239,172,0.6) 70%, transparent)" }} />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[280px_1fr_280px] items-center" style={{ padding: "28px 32px" }}>
          {/* ── COLUMN 1: Rank + Score ── */}
          <div className="flex items-center gap-5">
            {/* Rank Icon Circle */}
            <div className="shrink-0 flex items-center justify-center rounded-full" style={{
              width: 72, height: 72,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(74,222,128,0.3)",
              boxShadow: "0 0 0 8px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
              animation: "iconGlow 3s ease-in-out infinite",
            }}>
              <Trophy className="h-8 w-8" style={{ color: getRankIcon(d.facultyRank).color }} />
            </div>

            {/* Score Display */}
            <div>
              <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(134,239,172,0.7)" }}>Impact Score</p>
              <p className="font-extrabold leading-none" style={{
                fontSize: 56, fontFamily: "'JetBrains Mono', monospace",
                background: "linear-gradient(135deg, #FFFFFF 0%, #86EFAC 50%, #4ADE80 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {d.impactScore === 0 ? "0" : animatedScore}
              </p>
              {/* Rank Badge */}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full" style={{
                background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)",
                padding: "5px 14px",
              }}>
                {(() => { const ri = getRankIcon(d.facultyRank); const Ic = ri.icon; return <Ic className="h-3 w-3" style={{ color: ri.color }} /> })()}
                <span style={{ fontSize: 12, fontWeight: 600, color: "#86EFAC" }}>{d.facultyRank}</span>
              </div>
            </div>
          </div>

          {/* ── Divider 1 ── */}
          <div className="hidden md:flex items-center justify-center" style={{ height: "100%" }}>
            <div style={{ width: 1, height: "80%", background: "rgba(255,255,255,0.07)", margin: "0 32px", flexShrink: 0 }} />

          {/* ── COLUMN 2: Progress + Milestones ── */}
          <div className="flex-1 flex flex-col justify-center gap-4">
            {nextRank ? (
              <>
                {/* Current → Next rank row */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full text-[11px]" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86EFAC", padding: "4px 10px" }}>
                    {(() => { const ri = getRankIcon(d.facultyRank); const Ic = ri.icon; return <Ic className="h-3 w-3" style={{ color: ri.color }} /> })()}
                    {d.facultyRank}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{d.impactScore} / {nextRank.target} pts</span>
                  <span className="inline-flex items-center gap-1 rounded-full text-[11px]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "4px 10px" }}>
                    {(() => { const Ic = nextRank.icon; return <Ic className="h-3 w-3" style={{ color: nextRank.color }} /> })()}
                    {nextRank.name} →
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="rounded-full overflow-hidden" style={{ height: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #22C55E, #4ADE80, #86EFAC)",
                      backgroundSize: "200% auto",
                      animation: "shimmer 3s linear infinite",
                      boxShadow: progress > 0 ? "0 0 8px rgba(74,222,128,0.6)" : "none",
                      transition: "width 1500ms ease-out",
                    }} />
                  </div>
                  {/* Milestone markers */}
                  <div className="flex items-center justify-between mt-1.5">
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>0</span>
                    <div className="flex-1 flex items-center justify-around px-2">
                      {[100, 300, 600, 1000].map((m) => (
                        <div key={m} className="flex flex-col items-center gap-0.5">
                          <div className="rounded-full" style={{ width: 4, height: 4, background: d.impactScore >= m ? "rgba(74,222,128,0.8)" : "rgba(255,255,255,0.2)" }} />
                          <span style={{ fontSize: 8, color: d.impactScore >= m ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.25)" }}>{m}</span>
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{nextRank.target}</span>
                  </div>
                </div>

                {/* Motivational text */}
                <p className="text-center italic" style={{ fontSize: 11, color: "rgba(134,239,172,0.6)" }}>
                  {nextRank.target - d.impactScore} pts to unlock {nextRank.name}
                </p>
              </>
            ) : (
              <div className="text-center">
                <p style={{ fontSize: 14, fontWeight: 700, color: "#86EFAC" }}>🏆 Max Rank Achieved!</p>
                <p style={{ fontSize: 11, color: "rgba(134,239,172,0.5)", marginTop: 4 }}>You are a Campus Legend</p>
              </div>
            )}

            {/* How to earn */}
            <p className="text-center" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
              Downloads×2 + Likes×5 + Ratings×4 + Uploads×3 + Subjects×10
            </p>
          </div>

          {/* ── Divider 2 ── */}
            <div style={{ width: 1, height: "80%", background: "rgba(255,255,255,0.07)", margin: "0 32px", flexShrink: 0 }} />
          </div>

          {/* ── COLUMN 3: Stats Grid ── */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 md:mt-0">
            {[
              { icon: Download, label: "DOWNLOADS", value: d.totalDownloads, color: "#60A5FA" },
              { icon: Heart, label: "LIKES", value: d.totalLikes, color: "#F87171" },
              { icon: Star, label: "AVG RATING", value: d.averageRating.toFixed(1), sub: "/ 5.0", color: "#FBBF24" },
              { icon: FolderUp, label: "UPLOADS", value: d.totalUploads, color: "#A78BFA" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl transition-all duration-150 hover:!bg-[rgba(34,197,94,0.1)] hover:!border-[rgba(34,197,94,0.2)]" style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "14px 16px",
              }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="uppercase font-medium" style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(255,255,255,0.45)" }}>{s.label}</span>
                </div>
                <p className="font-bold leading-none" style={{ fontSize: 28, fontFamily: "'JetBrains Mono', monospace", color: "#F0FDF4", marginTop: 4 }}>
                  {s.value}
                </p>
                {s.sub && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{s.sub}</span>}
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
        @keyframes iconGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(74,222,128,0.6)); }
          50% { filter: drop-shadow(0 0 14px rgba(134,239,172,0.8)); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .heroCard { animation: heroEnter 400ms ease-out both; animation-delay: 100ms; }
        @keyframes heroEnter {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
