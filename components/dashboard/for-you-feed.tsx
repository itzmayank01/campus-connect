"use client"

import { useState, useEffect } from "react"
import { Sparkles, Download, Heart, TrendingUp, ExternalLink, User, Flame, Star } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Recommendation {
  resourceId: string
  score: number
  reasons: string[]
  resource: {
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
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  NOTES: { bg: "rgba(79,142,247,0.08)", text: "#4F8EF7", border: "rgba(79,142,247,0.2)" },
  QUESTION_PAPERS: { bg: "rgba(245,158,11,0.08)", text: "#F59E0B", border: "rgba(245,158,11,0.2)" },
  VIDEOS: { bg: "rgba(139,92,246,0.08)", text: "#8B5CF6", border: "rgba(139,92,246,0.2)" },
  REFERENCE: { bg: "rgba(52,211,153,0.08)", text: "#059669", border: "rgba(52,211,153,0.2)" },
}

const reputationBadges: Record<string, { emoji: string; color: string }> = {
  Legend: { emoji: "👑", color: "#FFD700" },
  Master: { emoji: "⭐", color: "#F59E0B" },
  Expert: { emoji: "🎯", color: "#8B5CF6" },
  Trusted: { emoji: "✅", color: "#059669" },
  Contributor: { emoji: "📝", color: "#4F8EF7" },
  Newcomer: { emoji: "🌱", color: "#94A3B8" },
}

function QualityBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  const color = score >= 0.7 ? "#059669" : score >= 0.4 ? "#F59E0B" : "#94A3B8"

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{percentage}%</span>
    </div>
  )
}

export function ForYouFeed() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch("/api/recommendations?limit=6")
        if (res.ok) {
          const data = await res.json()
          setRecommendations(data.recommendations || [])
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRecommendations()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-[#0F1117] font-display">For You</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#F1F5F9]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[#F1F5F9]" />
                <div className="h-2 w-1/2 rounded bg-[#F1F5F9]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || recommendations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-[#0F1117] font-display">For You</h2>
          <span className="ml-auto rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">AI</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-8 w-8 text-[#E2E8F0] mb-2" />
          <p className="text-sm text-[#94A3B8] text-center">
            Download and like resources to get<br />personalized recommendations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-ping" />
        </div>
        <h2 className="text-base font-bold text-[#0F1117] font-display">For You</h2>
        <span className="rounded-full bg-gradient-to-r from-[#F59E0B]/15 to-[#F97316]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F59E0B] tracking-wide">
          AI POWERED
        </span>
        <button className="ml-auto text-sm font-semibold text-[#4F8EF7] hover:text-[#3B7AE0] transition-colors duration-150">
          See All →
        </button>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-1">
        <AnimatePresence>
          {recommendations.map((rec, index) => {
            const typeStyle = typeColors[rec.resource.resourceType] || typeColors.NOTES
            const badge = reputationBadges[rec.resource.uploader.reputationLevel] || reputationBadges.Newcomer

            return (
              <motion.div
                key={rec.resourceId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group flex items-center justify-between rounded-xl p-3 transition-all duration-150 hover:bg-[#F8FAFC] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Type icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105"
                    style={{ backgroundColor: typeStyle.bg, border: `1px solid ${typeStyle.border}` }}
                  >
                    <span className="text-lg">
                      {rec.resource.resourceType === "NOTES" ? "📄" :
                       rec.resource.resourceType === "QUESTION_PAPERS" ? "📝" :
                       rec.resource.resourceType === "VIDEOS" ? "🎬" : "📚"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-[#0F1117] truncate">
                      {rec.resource.filename}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: typeStyle.bg,
                          color: typeStyle.text,
                          border: `1px solid ${typeStyle.border}`,
                        }}
                      >
                        {rec.resource.subject.code}
                      </span>

                      {/* Uploader with reputation */}
                      <span className="text-[11px] text-[#94A3B8] flex items-center gap-0.5">
                        <span>{badge.emoji}</span>
                        {rec.resource.uploader.name}
                      </span>

                      {/* Quality bar */}
                      <QualityBar score={rec.resource.qualityScore} />

                      {/* Trending indicator */}
                      {rec.resource.trendingScore > 0.3 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#F97316]">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Hot
                        </span>
                      )}
                    </div>

                    {/* Recommendation reason */}
                    {rec.reasons[0] && (
                      <p className="text-[10px] text-[#4F8EF7] mt-0.5 font-medium">
                        ✨ {rec.reasons[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-0.5">
                    <Download className="h-3 w-3" /> {rec.resource.downloadCount}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-0.5">
                    <Heart className="h-3 w-3" /> {rec.resource.likeCount}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
