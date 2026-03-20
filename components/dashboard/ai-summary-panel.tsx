"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp, Loader2, BookOpen, Target, Clock, BarChart2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface AiSummaryPanelProps {
  resourceId: string
}

interface SummaryData {
  bullets: string[]
  topics: string[]
  examTopics: string[]
  readTime: number | null
  difficulty: string | null
  error?: string
}

const difficultyColors: Record<string, string> = {
  Beginner: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
  Intermediate: "bg-[#FEF9C3] text-[#92400E] border-[#FDE68A]",
  Advanced: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
}

export function AiSummaryPanel({ resourceId }: AiSummaryPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const handleToggle = async () => {
    if (!fetched) {
      setLoading(true)
      setExpanded(true)
      try {
        const res = await fetch(`/api/resources/${resourceId}/ai-summary`)
        const json = await res.json()
        setData(json)
      } catch {
        setData({ bullets: [], topics: [], examTopics: [], readTime: null, difficulty: null, error: "Failed to load" })
      } finally {
        setLoading(false)
        setFetched(true)
      }
    } else {
      setExpanded(!expanded)
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-[11px] font-medium text-[#7C3AED] hover:text-[#6D28D9] bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 rounded-lg px-2.5 py-1.5 transition-all duration-150"
      >
        <Sparkles className="h-3 w-3" />
        AI Summary
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-[#EDE9FE] bg-gradient-to-br from-[#FAF5FF] to-white p-4 space-y-3">
              {loading && (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED]" />
                  <span className="text-sm text-[#7C3AED]">Generating AI summary...</span>
                </div>
              )}

              {data?.error && !data.bullets?.length && (
                <div className="flex items-center gap-2 text-sm text-[#DC2626]">
                  <AlertCircle className="h-4 w-4" />
                  {data.error}
                </div>
              )}

              {data && data.bullets && data.bullets.length > 0 && (
                <>
                  {/* Header row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {data.difficulty && (
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${difficultyColors[data.difficulty] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        <BarChart2 className="h-2.5 w-2.5 inline mr-0.5" />
                        {data.difficulty}
                      </span>
                    )}
                    {data.readTime && (
                      <span className="flex items-center gap-1 text-[10px] text-[#64748B]">
                        <Clock className="h-2.5 w-2.5" />
                        ~{data.readTime} min read
                      </span>
                    )}
                  </div>

                  {/* Summary bullets */}
                  <div>
                    <h5 className="text-xs font-bold text-[#475569] mb-1.5 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> What this covers
                    </h5>
                    <ul className="space-y-1">
                      {data.bullets.map((bullet, i) => (
                        <li key={i} className="text-xs text-[#475569] leading-relaxed flex gap-1.5">
                          <span className="text-[#7C3AED] mt-0.5">•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key topics */}
                  {data.topics && data.topics.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-[#475569] mb-1.5">Key Topics</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {data.topics.map((topic, i) => (
                          <span key={i} className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 text-[10px] font-medium">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Topics */}
                  {data.examTopics && data.examTopics.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-[#475569] mb-1.5 flex items-center gap-1">
                        <Target className="h-3 w-3 text-[#DC2626]" /> Likely Exam Topics
                      </h5>
                      <ul className="space-y-1">
                        {data.examTopics.map((topic, i) => (
                          <li key={i} className="text-xs text-[#475569] flex gap-1.5">
                            <span className="text-[#DC2626]">◉</span>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[9px] text-[#94A3B8] italic">AI-generated summary — verify with course materials</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
