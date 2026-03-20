"use client"

import { useState } from "react"
import { Brain, RefreshCw, Loader2, AlertCircle, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ExamPredictorProps {
  subjectId: string
  subjectName: string
}

interface Predictions {
  veryLikely: string[]
  likely: string[]
  possible: string[]
}

const probabilityConfig = {
  veryLikely: {
    label: "Most Important Topics",
    emoji: "🔥",
    barColor: "#EF4444",
    barPercent: 100,
    headerColor: "text-[#991B1B]",
  },
  likely: {
    label: "Important PYQ Questions",
    emoji: "📌",
    barColor: "#F59E0B",
    barPercent: 80,
    headerColor: "text-[#92400E]",
  },
  possible: {
    label: "Other Likely Questions",
    emoji: "💡",
    barColor: "#4F8EF7",
    barPercent: 50,
    headerColor: "text-[#1E40AF]",
  },
}

export function ExamPredictor({ subjectId, subjectName }: ExamPredictorProps) {
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [pyqCount, setPyqCount] = useState<number>(0)

  const fetchPredictions = async () => {
    setExpanded(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/subjects/${subjectId}/exam-predictor`)
      const data = await res.json()

      if (data.error && !data.predictions) {
        setError(data.error)
      } else if (data.predictions) {
        setPredictions(data.predictions)
        setGeneratedAt(data.generatedAt)
        setPyqCount(data.pyqCount || 0)
      }
    } catch {
      setError("Failed to load predictions")
    } finally {
      setLoading(false)
    }
  }

  // NO auto-fetch — user must click to load predictions
  // Subject pages load from DB only, AI is on-demand

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => {
          if (!expanded && !predictions && !loading) {
            fetchPredictions()
          } else {
            setExpanded(!expanded)
          }
        }}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#7C3AED]/5 to-[#A78BFA]/5 border-b border-[#F1F5F9] hover:from-[#7C3AED]/8 hover:to-[#A78BFA]/8 transition-all"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#7C3AED]" />
          <h3 className="text-sm font-bold text-[#0F1117]">🎯 Likely Exam Questions</h3>
          <span className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 text-[9px] font-bold tracking-wider">
            AI POWERED
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                fetchPredictions()
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all"
              title={predictions ? "Regenerate predictions" : "Load predictions"}
            >
              <RefreshCw className="h-3 w-3" />
              {predictions ? "Refresh" : "Load Predictions"}
            </button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" /> : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#0F1117]">Analyzing {subjectName}...</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      Reading PYQs and popular resources
                    </p>
                  </div>
                </div>
              )}

              {error && !predictions && (
                <div className="flex items-center gap-2 rounded-xl p-3 bg-[#FEF9C3] border border-[#FDE68A]">
                  <AlertCircle className="h-4 w-4 text-[#92400E]" />
                  <span className="text-sm text-[#92400E]">{error}</span>
                </div>
              )}

              {predictions && !loading && (
                <div className="space-y-4">
                  {(["veryLikely", "likely", "possible"] as const).map((tier) => {
                    const config = probabilityConfig[tier]
                    const items = predictions[tier]
                    if (!items || items.length === 0) return null

                    return (
                      <div key={tier}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{config.emoji}</span>
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${config.headerColor}`}>
                            {config.label}
                          </h4>
                          <div className="flex-1 h-1 rounded-full bg-[rgba(0,0,0,0.04)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: config.barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${config.barPercent}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: config.barColor }}>
                            {config.barPercent}%
                          </span>
                        </div>
                        <ul className="space-y-1.5 ml-6">
                          {items.map((item, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="text-sm text-[#334155] leading-relaxed flex items-start gap-2"
                            >
                              <Zap className="h-3 w-3 mt-1 shrink-0" style={{ color: config.barColor }} />
                              {item}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F1F5F9]">
                    <p className="text-[10px] text-[#94A3B8]">
                      Based on {pyqCount} PYQ{pyqCount !== 1 ? "s" : ""} and popular resources
                    </p>
                    {generatedAt && (
                      <p className="text-[10px] text-[#94A3B8]">
                        Generated{" "}
                        {new Date(generatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </div>

                  <p className="text-[9px] text-[#CBD5E1] italic text-center">
                    ⚠️ AI predictions — use as study guidance, not guaranteed exam content
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
