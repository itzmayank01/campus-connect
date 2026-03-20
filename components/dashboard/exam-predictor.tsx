"use client"

import { useState, useEffect } from "react"
import { Brain, RefreshCw, AlertCircle, Zap, ChevronDown, ChevronUp, History, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ExamPredictorProps {
  subjectId: string
  subjectName: string
}

interface ProbabilityItem {
  topic: string
  reason: string
}

interface Predictions {
  high_probability: ProbabilityItem[]
  medium_probability: ProbabilityItem[]
  low_probability: ProbabilityItem[]
  based_on: string
  disclaimer: boolean
  is_default?: boolean
}

export function ExamPredictor({ subjectId, subjectName }: ExamPredictorProps) {
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchPredictions = async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/subjects/${subjectId}/exam-predictor`)
      const data = await res.json()
      setPredictions(data)
    } catch {
      // API now returns 200 with default predictions on most failures
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPredictions()
  }, [subjectId])

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#7C3AED]/5 to-[#A78BFA]/5 border-b border-[#F1F5F9]"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#7C3AED]" />
          <h3 className="text-sm font-bold text-[#0F1117]">🎯 Likely Exam Questions</h3>
          <span className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 text-[9px] font-bold tracking-wider">
            AI POWERED
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && predictions && (
            <button
              onClick={() => fetchPredictions(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-[#F1F5F9] rounded-full transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" /> : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(expanded || !predictions) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {loading && !predictions && (
                <div className="space-y-4 py-2">
                   <div className="h-6 w-1/3 bg-[#F1F5F9] animate-pulse rounded" />
                   <div className="space-y-2">
                      <div className="h-4 w-full bg-[#F1F5F9] animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-[#F1F5F9] animate-pulse rounded" />
                   </div>
                   <div className="h-6 w-1/4 bg-[#F1F5F9] animate-pulse rounded" />
                   <div className="space-y-2">
                      <div className="h-4 w-full bg-[#F1F5F9] animate-pulse rounded" />
                   </div>
                </div>
              )}

              {predictions && (
                <div className="space-y-6">
                  {predictions.is_default && (
                    <div className="flex items-start gap-3 rounded-xl p-4 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]">
                      <Info className="h-5 w-5 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#475569]">Limited data for precise prediction</p>
                        <p className="text-xs">📚 Upload previous year question papers for this subject to enable high-accuracy AI exam predictions. Showing general patterns based on the subject name for now.</p>
                      </div>
                    </div>
                  )}

                  {!predictions.is_default && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full w-fit">
                       <History className="h-3 w-3" />
                       Based on: {predictions.based_on}
                    </div>
                  )}

                  {/* High Probability */}
                  {predictions.high_probability.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#EF4444]" />
                        <h4 className="text-[11px] font-bold text-[#991B1B] uppercase tracking-wider">High Probability</h4>
                      </div>
                      <div className="space-y-2 ml-4">
                        {predictions.high_probability.map((item, i) => (
                          <div key={i} className="group">
                             <div className="text-sm text-[#1E293B] font-medium">• {item.topic}</div>
                             <div className="text-xs text-[#64748B] ml-3 mt-0.5 opacity-80">{item.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium Probability */}
                  {predictions.medium_probability.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                        <h4 className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider">Medium Probability</h4>
                      </div>
                      <div className="space-y-2 ml-4">
                        {predictions.medium_probability.map((item, i) => (
                          <div key={i}>
                             <div className="text-sm text-[#334155]">• {item.topic}</div>
                             <div className="text-xs text-[#64748B] ml-3 mt-0.5 opacity-80">{item.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Low Probability / Worth Revising */}
                  {predictions.low_probability.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                        <h4 className="text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Worth Revising</h4>
                      </div>
                      <div className="space-y-2 ml-4">
                        {predictions.low_probability.map((item, i) => (
                          <div key={i} className="text-sm text-[#475569]">• {item.topic}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#F1F5F9]">
                    <p className="text-[10px] text-[#94A3B8] italic text-center flex items-center justify-center gap-1.5">
                      <AlertCircle className="h-3 w-3" />
                      AI prediction only. Verify with your department faculty.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
