"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Download, Heart, Flame, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface TrendingResource {
  id: string
  filename: string
  subject: { id: string; name: string; code: string }
  resourceType: string
  downloadCount: number
  likeCount: number
  qualityScore: number
  trendingScore: number
  uploader: {
    name: string
    image: string | null
    reputationLevel: string
  }
  createdAt: string
}

const reputationEmojis: Record<string, string> = {
  Legend: "👑",
  Master: "⭐",
  Expert: "🎯",
  Trusted: "✅",
  Contributor: "📝",
  Newcomer: "🌱",
}

function TrendingBadge({ rank }: { rank: number }) {
  const colors = [
    { bg: "linear-gradient(135deg, #FEF3C7, #FDE68A)", text: "#92400E", border: "#F59E0B" }, // #1
    { bg: "linear-gradient(135deg, #F1F5F9, #E2E8F0)", text: "#475569", border: "#94A3B8" }, // #2
    { bg: "linear-gradient(135deg, #FFF7ED, #FED7AA)", text: "#9A3412", border: "#FB923C" }, // #3
  ]
  const style = colors[rank - 1] || { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" }

  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-lg font-bold text-xs"
      style={{
        width: 28,
        height: 28,
        background: style.bg,
        color: style.text,
        border: `1.5px solid ${style.border}`,
      }}
    >
      {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
    </div>
  )
}

export function TrendingResources() {
  const [trending, setTrending] = useState<TrendingResource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("/api/trending?limit=5")
        if (res.ok) {
          const data = await res.json()
          setTrending(data.trending || [])
        }
      } catch {
        // Graceful fallback
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#F97316]" />
          <h3 className="text-sm font-bold text-[#0F1117] font-display">Trending Now</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-[#F1F5F9]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-3/4 rounded bg-[#F1F5F9]" />
                <div className="h-2 w-1/2 rounded bg-[#F1F5F9]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (trending.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-[#F97316]" />
          <h3 className="text-sm font-bold text-[#0F1117] font-display">Trending Now</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <TrendingUp className="h-6 w-6 text-[#E2E8F0] mb-1.5" />
          <p className="text-xs text-[#94A3B8] text-center">
            No trending resources yet.<br />Upload to get started!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <TrendingUp className="h-4 w-4 text-[#F97316]" />
          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#F97316] animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-[#0F1117] font-display">Trending Now</h3>
        <span className="rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[9px] font-bold text-[#F97316] tracking-wider">
          LIVE
        </span>
      </div>

      {/* Trending List */}
      <div className="space-y-1">
        {trending.map((resource, index) => {
          const uploaderEmoji = reputationEmojis[resource.uploader.reputationLevel] || "🌱"

          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.06 }}
              className="group flex items-center gap-2.5 rounded-lg p-2 transition-all duration-150 hover:bg-[#FFF7ED] cursor-pointer"
            >
              <TrendingBadge rank={index + 1} />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#0F1117] truncate leading-tight">
                  {resource.filename}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold text-[#F97316] bg-[#F97316]/8 rounded px-1 py-px">
                    {resource.subject.code}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {uploaderEmoji} {resource.uploader.name}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-[10px] text-[#64748B] flex items-center gap-0.5">
                  <Download className="h-2.5 w-2.5" />{resource.downloadCount}
                </span>
                <span className="text-[10px] text-[#F97316] flex items-center gap-0.5 font-semibold">
                  <Flame className="h-2.5 w-2.5" />{Math.round(resource.trendingScore * 100)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
