"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Trophy, ChevronDown, ChevronUp, TrendingUp, ArrowUp, ArrowDown, Minus, Upload } from "lucide-react"
import Link from "next/link"

// ─── Types ───────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  initials: string
  avatar_url: string | null
  current_streak: number
  flame_level: string
  flame_score: number
  points_this_period: number
  upload_count: number
  is_current_user: boolean
}

interface CurrentUser {
  rank: number | null
  points: number
  flame_level: string
  current_streak: number
  points_to_next_rank: number
  uploads_to_climb: number
  motivational_tip: string
}

type Period = "week" | "month" | "all"

// ─── Helpers ─────────────────────────────────────────────────────
function getFlameEmojis(level: string): string {
  switch (level) {
    case "Legend Flame": return "🔥🔥🔥🔥🔥"
    case "Inferno": return "🔥🔥🔥🔥"
    case "Raging Flame": return "🔥🔥🔥"
    case "Growing Flame": return "🔥🔥"
    default: return "🔥"
  }
}

function getAvatarColor(userId: string): string {
  if (!userId) return "#94A3B8"
  const colors = [
    '#EF4444', '#F97316', '#EAB308',
    '#22C55E', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6'
  ]
  const index = userId.charCodeAt(0) % colors.length
  return colors[index]
}

function getNextMonday(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const nextMon = new Date(now)
  nextMon.setDate(now.getDate() + diff)
  nextMon.setHours(0, 0, 0, 0)
  return nextMon
}

// ─── Confetti Particle ──────────────────────────────────────────
function ConfettiParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: 15 + Math.random() * 70,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 4,
    color: ["#F59E0B", "#FDE68A", "#FB923C", "#FBBF24", "#F97316", "#FCD34D"][i],
  }))

  return (
    <div style={{ position: "absolute", top: -10, left: 0, right: 0, height: 60, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.size > 6 ? "1px" : "50%",
            backgroundColor: p.color,
            animation: `confettiDrift ${p.duration}s ease-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Avatar Component ───────────────────────────────────────────
function Avatar({ initials, userId, size = 40 }: { initials: string; userId: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(userId),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.35,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

// ─── Podium Card ────────────────────────────────────────────────
function EmptyPodiumCard({ rank }: { rank: number }) {
  const configs = {
    1: { width: 200, bg: "#FEF3C7", border: "#FDE68A", h: 80, bH: 80, text: "#92400E" },
    2: { width: 176, bg: "#F8FAFC", border: "#E2E8F0", h: 56, bH: 56, text: "#475569" },
    3: { width: 176, bg: "#FFF7ED", border: "#FED7AA", h: 40, bH: 40, text: "#9A3412" }
  } as const
  const c = configs[rank as 1|2|3]

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        width: c.width,
        background: "#F8FAFC",
        border: "2px dashed #E2E8F0",
        borderRadius: 16,
        padding: "24px 16px",
        textAlign: "center",
        zIndex: 1,
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
        <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 8 }}>---</div>
        <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 500 }}>
          Be the first!<br/>Upload a resource<br/>to claim this spot.
        </div>
      </div>
      <div style={{
        width: c.width - 32,
        height: c.bH,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "0 0 8px 8px",
        marginTop: -2,
        zIndex: 0
      }} />
    </div>
  )
}

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const isGold = rank === 1

  const configs = {
    1: {
      width: 200, avatarSize: 72,
      bg: "linear-gradient(135deg, #FEF3C7, #FDE68A, #F59E0B)",
      border: "#F59E0B", shadow: "0 8px 32px rgba(245,158,11,0.4)",
      ringColor: "#F59E0B", ringWidth: 3,
      medal: "👑", podiumH: 80,
      podiumBg: "linear-gradient(180deg, #FDE68A, #F59E0B)",
      pointColor: "#92400E",
      anim: "podiumDropBounce 500ms ease-out 200ms both",
    },
    2: {
      width: 176, avatarSize: 60,
      bg: "linear-gradient(135deg, #F8FAFC, #F1F5F9)",
      border: "#CBD5E1", shadow: "0 4px 16px rgba(0,0,0,0.08)",
      ringColor: "#94A3B8", ringWidth: 2,
      medal: "🥈", podiumH: 56,
      podiumBg: "linear-gradient(180deg, #E2E8F0, #94A3B8)",
      pointColor: "#475569",
      anim: "podiumSlideLeft 300ms ease-out 100ms both",
    },
    3: {
      width: 176, avatarSize: 60,
      bg: "linear-gradient(135deg, #FFF7ED, #FED7AA)",
      border: "#FB923C", shadow: "0 4px 16px rgba(251,146,60,0.2)",
      ringColor: "#FB923C", ringWidth: 2,
      medal: "🥉", podiumH: 40,
      podiumBg: "linear-gradient(180deg, #FED7AA, #FB923C)",
      pointColor: "#9A3412",
      anim: "podiumSlideRight 300ms ease-out both",
    },
  }

  const c = configs[rank]

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: c.anim }}>
      <div style={{
        width: c.width, background: c.bg, border: `2px solid ${c.border}`, borderRadius: 16,
        padding: "20px 16px", textAlign: "center", boxShadow: c.shadow, position: "relative",
        transition: "transform 200ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isGold && <ConfettiParticles />}
        <div style={{ fontSize: isGold ? 32 : 24, marginBottom: 8, ...(isGold ? { animation: "crownFloat 2s ease-in-out infinite" } : {}) }}>
          {c.medal}
        </div>
        <div style={{
          margin: "0 auto 8px", width: c.avatarSize + c.ringWidth * 2 + 4, height: c.avatarSize + c.ringWidth * 2 + 4,
          borderRadius: "50%", border: `${c.ringWidth}px solid ${c.ringColor}`, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Avatar initials={entry.initials} userId={entry.user_id} size={c.avatarSize} />
        </div>
        <div style={{ fontSize: isGold ? 16 : 14, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>
          {entry.full_name}
        </div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          {getFlameEmojis(entry.flame_level)}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isGold ? 24 : 20, fontWeight: 700, color: c.pointColor, marginBottom: 4 }}>
          {entry.points_this_period} pts
        </div>
        <div style={{ fontSize: 13, color: rank === 1 ? "#B45309" : "#64748B" }}>
          🔥 {entry.current_streak} days
        </div>
      </div>
      <div style={{ width: c.width - 32, height: c.podiumH, background: c.podiumBg, borderRadius: "0 0 8px 8px", marginTop: -2 }} />
    </div>
  )
}

// ─── Rankings Table Row ─────────────────────────────────────────
function RankingRow({ entry }: { entry: LeaderboardEntry }) {
  const isTop3 = entry.rank <= 3
  const medals = ["", "🥇", "🥈", "🥉"]
  const isCurrent = entry.is_current_user

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "60px 1fr 80px 120px 100px 90px",
      alignItems: "center", height: 64, padding: "0 20px",
      borderBottom: "1px solid #F1F5F9", background: isCurrent ? "#EFF6FF" : "transparent",
      borderLeft: isCurrent ? "3px solid #4F8EF7" : "3px solid transparent",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: isTop3 ? 18 : 14, fontWeight: isTop3 ? 400 : 600, color: "#1E293B" }}>
          {isTop3 ? medals[entry.rank] : `#${entry.rank}`}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar initials={entry.initials} userId={entry.user_id} size={40} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
          {entry.full_name}
          {isCurrent && <span style={{ color: "#4F8EF7", fontWeight: 700, marginLeft: 6, fontSize: 12 }}>(You)</span>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: entry.current_streak > 0 ? "#F97316" : "#94A3B8", fontWeight: 600 }}>
        {entry.current_streak > 0 ? `🔥 ${entry.current_streak}d` : "— 0d"}
      </div>
      <div style={{ fontSize: 12 }}>
        {getFlameEmojis(entry.flame_level)} <span style={{ marginLeft: 4, color: "#64748B" }}>{entry.flame_level}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
        {entry.points_this_period}
      </div>
      <div style={{ fontSize: 12, color: "#64748B" }}>
        {entry.upload_count} uploads
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [totalStudents, setTotalStudents] = useState<number>(0)
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [loaded, setLoaded] = useState(false)
  
  // Real-time tracker
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [timeAgoDisplay, setTimeAgoDisplay] = useState("just now")

  const fetchLeaderboard = useCallback(async (p: Period, silent = false) => {
    if (!silent) setLoaded(false)
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
        setCurrentUser(data.current_user)
        setTotalStudents(data.total_students || 0)
        setLastUpdateTime(new Date())
        setTimeAgoDisplay("just now")
      }
    } catch (e) {
      console.error("Leaderboard error:", e)
    } finally {
      if (!silent) setLoaded(true)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(period, false)
    
    // Silent 5min periodic refresh
    const syncInterval = setInterval(() => fetchLeaderboard(period, true), 300000)
    return () => clearInterval(syncInterval)
  }, [period, fetchLeaderboard])

  useEffect(() => {
    if (!lastUpdateTime) return
    const id = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdateTime.getTime()) / 1000)
      if (seconds < 10) setTimeAgoDisplay("just now")
      else if (seconds < 60) setTimeAgoDisplay(`${seconds}s ago`)
      else setTimeAgoDisplay(`${Math.floor(seconds / 60)}m ago`)
    }, 10000)
    return () => clearInterval(id)
  }, [lastUpdateTime])

  useEffect(() => {
    function update() {
      const target = getNextMonday()
      const diff = Math.max(0, target.getTime() - Date.now())
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const periodLabels: Record<Period, string> = { week: "This Week", month: "This Month", all: "All Time" }
  const top1 = leaderboard.find(l => l.rank === 1)
  const top2 = leaderboard.find(l => l.rank === 2)
  const top3 = leaderboard.find(l => l.rank === 3)
  const isInTop15 = leaderboard.some(u => u.is_current_user)

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#0F1117", margin: 0 }}>🏆 Campus Leaderboard</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "6px 0 0" }}>Rankings are calculated natively from verified file engagement.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: "1px solid #E2E8F0" }}>
            {(["week", "month", "all"] as Period[]).map((p) => (
              <button
                key={p} onClick={() => setPeriod(p)}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", outline: "none", transition: "all 200ms ease",
                  backgroundColor: period === p ? "#4F8EF7" : "#F8FAFC", color: period === p ? "#fff" : "#64748B",
                }}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>
            Updated {timeAgoDisplay} • {totalStudents} students tracked
          </div>
        </div>
      </div>

      {/* Podium */}
      {loaded && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 24, marginBottom: 40, padding: "20px 0 0", flexWrap: "wrap" }}>
          {top2 ? <PodiumCard entry={top2} rank={2} /> : <EmptyPodiumCard rank={2} />}
          {top1 ? <PodiumCard entry={top1} rank={1} /> : <EmptyPodiumCard rank={1} />}
          {top3 ? <PodiumCard entry={top3} rank={3} /> : <EmptyPodiumCard rank={3} />}
        </div>
      )}

      {/* User Context Card Container */}
      {loaded && currentUser && (
        <div style={{ marginBottom: 32 }}>
          {isInTop15 ? (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#166534" }}>You're in the Top 15!</div>
                <div style={{ fontSize: 13, color: "#15803D" }}>Keep up the momentum to hold your rank!</div>
              </div>
            </div>
          ) : currentUser.rank === null ? (
            <div style={{ background: "#F8FAFC", border: "2px dashed #CBD5E1", borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>📊 Start Your Journey</div>
              <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>You're not on the leaderboard yet. Upload your first resource to earn points and appear in rankings!</div>
              <Link href="/dashboard/upload/new" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#4F8EF7", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                <Upload size={16} /> Upload Your First Resource
              </Link>
            </div>
          ) : (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>📊 Your Current Rank</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "#4F8EF7" }}>
                  #{currentUser.rank}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>(You)</span>
                <span style={{ fontSize: 13, color: currentUser.current_streak > 0 ? "#F97316" : "#64748B", fontWeight: 600 }}>🔥 {currentUser.current_streak}d</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
                  {currentUser.points} pts
                </span>
              </div>
              <div style={{ borderTop: "1px dashed #BFDBFE", paddingTop: 12 }}>
                <div style={{ fontSize: 13, color: "#4F8EF7", fontWeight: 600 }}>↑ {currentUser.points_to_next_rank} pts to reach rank #{currentUser.rank - 1}</div>
                <div style={{ fontSize: 12, color: "#64748B", fontStyle: "italic", marginTop: 4 }}>{currentUser.motivational_tip}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats Block */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 120px 100px 90px", alignItems: "center", height: 44, padding: "0 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          {["Rank", "Student", "Streak", "Flame Level", "Points", "Uploads"].map(h => (
            <div key={h} style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#94A3B8", fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {!loaded ? (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 64, borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", padding: "0 20px", background: "#FFF" }}>
                <div style={{ height: 20, width: "100%", background: "#F1F5F9", borderRadius: 4, animation: "skeletonPulse 2s infinite" }} />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>No activity recorded yet for this period.</div>
            <div style={{ fontSize: 14, color: "#94A3B8" }}>Be the very first to top the board!</div>
          </div>
        ) : (
          leaderboard.map((entry) => <RankingRow key={entry.user_id} entry={entry} />)
        )}
      </div>

      {/* Weekly Reset Block */}
      <div style={{ background: "#1E293B", borderRadius: 12, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4F8EF7", display: "inline-block", animation: "skeletonPulse 2s infinite" }} />
            <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>⏱️ Weekly Reset in</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: "#fff", display: "flex", gap: 4 }}>
            <span>{countdown.d}<span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>d</span></span><span style={{ color: "#475569" }}>:</span>
            <span>{String(countdown.h).padStart(2, "0")}<span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>h</span></span><span style={{ color: "#475569" }}>:</span>
            <span>{String(countdown.m).padStart(2, "0")}<span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>m</span></span><span style={{ color: "#475569" }}>:</span>
            <span>{String(countdown.s).padStart(2, "0")}<span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>s</span></span>
          </div>
        </div>
      </div>

    </div>
  )
}
