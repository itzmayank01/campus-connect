"use client"

import { useState, useEffect } from "react"
import { Search, Download, Heart, Star, Eye, Bookmark, Sparkles, Loader2, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface RecommendedResource {
  rank: number
  tier: string
  id: string
  filename: string
  description: string | null
  subject: { id: string; name: string; code: string } | null
  resourceType: string
  semester: number
  downloadCount: number
  likeCount: number
  averageRating: number
  bookmarkCount: number
  popularityPercent: number
  mimeType: string
  s3Key: string | null
  resourceUrl: string | null
  uploader: { name: string; image: string | null }
  createdAt: string
}

const tierLabels: Record<string, { label: string; emoji: string }> = {
  most_popular: { label: "Most Popular", emoji: "🔥" },
  frequently_used: { label: "Frequently Used", emoji: "👍" },
  recently_added: { label: "Recently Added", emoji: "✨" },
  not_explored: { label: "Not Yet Explored", emoji: "📂" },
}

const typeFilterTabs = [
  { value: "all", label: "All", emoji: "" },
  { value: "SYLLABUS", label: "Syllabus", emoji: "📖" },
  { value: "NOTES", label: "Notes", emoji: "📄" },
  { value: "QUESTION_PAPERS", label: "PYQs", emoji: "❓" },
  { value: "VIDEOS", label: "Videos", emoji: "🎬" },
  { value: "REFERENCE", label: "Reference", emoji: "📚" },
]

const typeLabels: Record<string, string> = {
  SYLLABUS: "Syllabus",
  NOTES: "Notes",
  QUESTION_PAPERS: "PYQs",
  VIDEOS: "Videos",
  REFERENCE: "Reference",
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return null
  const styles = {
    1: { bg: "#FEF9C3", text: "#92400E", label: "#1" },
    2: { bg: "#F1F5F9", text: "#475569", label: "#2" },
    3: { bg: "#FFF7ED", text: "#9A3412", label: "#3" },
  }
  const s = styles[rank as 1 | 2 | 3]
  return (
    <span
      className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-extrabold shrink-0"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

function PopularityBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#4F8EF7" }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <span className="text-[10px] font-semibold text-[#4F8EF7]">{percent}%</span>
    </div>
  )
}

interface SearchRecommendationsProps {
  query: string | null
}

export function SearchRecommendations({ query }: SearchRecommendationsProps) {
  const [resources, setResources] = useState<RecommendedResource[]>([])
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})
  const [searchCount, setSearchCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [studyTip, setStudyTip] = useState<string | null>(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!query) {
      setShow(false)
      return
    }

    async function fetchRecommendations() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/smart-feed/search-recommendations?query=${encodeURIComponent(query!)}`
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()

        if (data) {
          setResources(data.resources)
          setTypeCounts(data.typeCounts || {})
          setSearchCount(data.searchCount)
          setShow(true)

          // Fetch study tip
          setTipLoading(true)
          try {
            const tipRes = await fetch("/api/ai/study-tip", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query,
                searchCount: data.searchCount,
                resourceTitles: data.resources.slice(0, 10).map((r: RecommendedResource) => r.filename),
              }),
            })
            const tipData = await tipRes.json()
            setStudyTip(tipData.tip)
          } catch {
            setStudyTip(null)
          } finally {
            setTipLoading(false)
          }
        } else {
          setShow(false)
        }
      } catch {
        setShow(false)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [query])

  if (!show && !loading) return null

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#4F8EF7]" />
          <span className="text-sm text-[#64748B]">Finding recommendations for &quot;{query}&quot;...</span>
        </div>
      </div>
    )
  }

  const filtered =
    activeFilter === "all"
      ? resources
      : resources.filter((r) => r.resourceType === activeFilter)

  // Group by tier
  const tiers = ["most_popular", "frequently_used", "recently_added", "not_explored"]
  const groupedByTier = tiers
    .map((tier) => ({
      tier,
      resources: filtered.filter((r) => r.tier === tier),
    }))
    .filter((g) => g.resources.length > 0)

  const handleDownload = async (resourceId: string) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/download`)
      if (!res.ok) return
      const data = await res.json()
      if (data.type === "youtube") {
        window.open(data.redirectUrl, "_blank")
      } else if (data.downloadUrl) {
        const a = document.createElement("a")
        a.href = data.downloadUrl
        a.download = ""
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch {}
  }

  const handlePreview = async (resourceId: string) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/preview`)
      if (!res.ok) return
      const data = await res.json()
      if (data.previewUrl) window.open(data.previewUrl, "_blank")
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4F8EF7]/5 to-[#60A5FA]/5 px-6 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-[#4F8EF7]" />
          <h2 className="text-base font-bold text-[#0F1117]">
            Based on your searches: &quot;{query}&quot;
          </h2>
        </div>
        <p className="text-sm text-[#64748B] mt-1">
          You&apos;ve searched this {searchCount} times this week — here are all resources, best first
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* AI Study Tip */}
        {(studyTip || tipLoading) && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#4F8EF7]" />
              <span className="text-sm font-bold text-[#1E40AF]">AI Study Tip for You</span>
            </div>
            {tipLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F8EF7]" />
                <span className="text-sm text-[#1E40AF]/70">Generating personalized tip...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#1E40AF] leading-relaxed">&ldquo;{studyTip}&rdquo;</p>
                <p className="text-[11px] text-[#1E40AF]/60 mt-2">— Campus AI</p>
              </>
            )}
          </div>
        )}

        {/* Type Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typeFilterTabs.map((tab) => {
            const count = tab.value === "all" ? typeCounts.all : typeCounts[tab.value] || 0
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  activeFilter === tab.value
                    ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                    : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
              >
                {tab.emoji && <span>{tab.emoji}</span>}
                {tab.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Resource List by Tier */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {groupedByTier.map((group) => {
              const tierInfo = tierLabels[group.tier]
              return (
                <motion.div
                  key={group.tier}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{tierInfo.emoji}</span>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                      {tierInfo.label}
                    </h3>
                    <span className="text-[10px] text-[#94A3B8]">({group.resources.length})</span>
                  </div>

                  <div className="space-y-1">
                    {group.resources.map((resource, idx) => (
                      <motion.div
                        key={resource.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group flex items-center gap-3 rounded-xl p-3 hover:bg-[#F8FAFC] transition-all duration-150"
                      >
                        {/* Rank badge */}
                        <RankBadge rank={resource.rank} />
                        {resource.rank > 3 && <div className="w-6" />}

                        {/* Type icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(79,142,247,0.08)] border border-[rgba(79,142,247,0.15)]">
                          <span className="text-base">
                            {resource.resourceType === "NOTES"
                              ? "📄"
                              : resource.resourceType === "QUESTION_PAPERS"
                              ? "📝"
                              : resource.resourceType === "VIDEOS"
                              ? "🎬"
                              : "📚"}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-[#0F1117] truncate">
                            {resource.filename}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {resource.subject && (
                              <span className="text-[10px] text-[#64748B]">
                                {resource.subject.code}
                              </span>
                            )}
                            <span className="text-[10px] text-[#94A3B8]">•</span>
                            <span className="text-[10px] text-[#64748B]">
                              {typeLabels[resource.resourceType] || resource.resourceType}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">•</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              Sem {resource.semester}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">•</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              by {resource.uploader.name}
                            </span>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-0.5 text-[10px] text-[#64748B]">
                              <Download className="h-3 w-3" />
                              {resource.downloadCount}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-[#64748B]">
                              <Heart className="h-3 w-3" />
                              {resource.likeCount}
                            </span>
                            {resource.averageRating > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#D97706]">
                                <Star className="h-3 w-3 fill-[#D97706]" />
                                {resource.averageRating.toFixed(1)}
                              </span>
                            )}
                            <PopularityBar percent={resource.popularityPercent} />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(resource.id)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 transition-all"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                          {resource.mimeType?.includes("pdf") && (
                            <button
                              onClick={() => handlePreview(resource.id)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all"
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <Filter className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">No resources match this filter</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
