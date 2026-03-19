"use client"

import { useState, useEffect } from "react"
import { Loader2, Crown, Medal, Info } from "lucide-react"

interface FacultyEntry {
  id: string
  name: string
  department: string
  totalDownloads: number
  totalLikes: number
  averageRating: number
  totalUploads: number
  impactScore: number
  facultyRank: string
  isCurrentUser: boolean
}

function getRankInfo(score: number) {
  if (score >= 1000) return { title: "👑 Campus Legend", color: "#F59E0B" }
  if (score >= 600) return { title: "💎 Elite Faculty", color: "#8B5CF6" }
  if (score >= 300) return { title: "🔥 Top Instructor", color: "#EF4444" }
  if (score >= 100) return { title: "🌟 Active Educator", color: "#F59E0B" }
  return { title: "📚 Contributor", color: "#64748B" }
}

export default function FacultyLeaderboardPage() {
  const [faculty, setFaculty] = useState<FacultyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"week" | "month" | "all">("all")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/faculty/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => setFaculty(Array.isArray(d.faculty) ? d.faculty : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  const top3 = faculty.slice(0, 3)
  const rest = faculty.slice(3, 15)

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F1117]">Faculty Leaderboard</h1>
        <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? "bg-white text-[#0F1117] shadow-sm" : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Formula Info */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-[#4F8EF7]" />
          <h3 className="text-sm font-bold text-[#0F1117]">Impact Score Formula</h3>
        </div>
        <p className="text-xs text-[#64748B]">
          Downloads×2 + Likes×5 + Ratings×4 + Verified_Uploads×3 + Subjects_Covered×10
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { range: "0-99", title: "📚 Contributor" },
            { range: "100-299", title: "🌟 Active Educator" },
            { range: "300-599", title: "🔥 Top Instructor" },
            { range: "600-999", title: "💎 Elite Faculty" },
            { range: "1000+", title: "👑 Campus Legend" },
          ].map((r) => (
            <span key={r.range} className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 text-[10px] text-[#64748B]">
              {r.range}: {r.title}
            </span>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 0, 2].map((idx) => {
            const f = top3[idx]
            if (!f) return <div key={idx} />
            const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"
            const bg = rank === 1 ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" : rank === 2 ? "linear-gradient(135deg, #F1F5F9, #E2E8F0)" : "linear-gradient(135deg, #FED7AA, #FDBA74)"
            const border = rank === 1 ? "#FCD34D" : rank === 2 ? "#CBD5E1" : "#FB923C"
            return (
              <div
                key={idx}
                className={`rounded-2xl p-5 text-center border-2 shadow-lg ${rank === 1 ? "transform -translate-y-2" : ""}`}
                style={{ background: bg, borderColor: border }}
              >
                {rank === 1 && <div className="text-3xl mb-1 animate-[crownGlow_2s_ease-in-out_infinite]">👑</div>}
                <span className="text-2xl">{medal}</span>
                <p className="text-sm font-bold text-[#0F1117] mt-2">{f.name || "Anonymous"}</p>
                <p className="text-[10px] text-[#64748B]">{f.department || "Faculty"}</p>
                <p className="text-xl font-extrabold text-[#0F1117] mt-2">{f.impactScore}</p>
                <p className="text-[10px] text-[#64748B]">{getRankInfo(f.impactScore).title}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Full Table */}
      {rest.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#F1F5F9] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold">Rank</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold hidden md:table-cell">Downloads</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold hidden md:table-cell">Likes</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold">Score</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-semibold">Rank Title</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((f, i) => (
                <tr
                  key={f.id}
                  className={`border-b border-[#F8FAFC] transition-colors ${f.isCurrentUser ? "bg-[#F0FDF4] border-l-[3px] border-l-[#22C55E]" : "hover:bg-[#F8FAFC]"}`}
                >
                  <td className="px-4 py-3 text-sm font-bold text-[#94A3B8]">{i + 4}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#0F1117]">{f.name || "Anonymous"}</p>
                    <p className="text-[10px] text-[#94A3B8]">{f.department || "Faculty"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B] hidden md:table-cell">{f.totalDownloads}</td>
                  <td className="px-4 py-3 text-sm text-[#64748B] hidden md:table-cell">{f.totalLikes}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#0F1117]">{f.impactScore}</td>
                  <td className="px-4 py-3 text-xs">{getRankInfo(f.impactScore).title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {faculty.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#94A3B8]">No faculty data yet. Be the first to upload!</p>
        </div>
      )}

      <style jsx global>{`
        @keyframes crownGlow {
          0%, 100% { filter: drop-shadow(0 0 8px #F59E0B); }
          50% { filter: drop-shadow(0 0 24px #F59E0B); }
        }
      `}</style>
    </div>
  )
}
