"use client"

import { useState, useEffect } from "react"
import { Brain, RefreshCw, AlertCircle, ChevronDown, ChevronUp, History, Info, Sparkles, Loader2, BookOpen, HelpCircle, MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

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

interface GeneratedQuestion {
  number: number
  question: string
  topic: string
  importance: "high" | "medium"
  marks: string
  answer?: string
  type: string
}

interface QuestionsData {
  questions: GeneratedQuestion[]
  total_questions: number
  focus_topic: string
  based_on: string
}

export function ExamPredictor({ subjectId, subjectName }: ExamPredictorProps) {
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  
  // Generated questions state
  const [questions, setQuestions] = useState<QuestionsData | null>(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({})

  const fetchPredictions = async (force = false) => {
    setLoading(true)
    try {
      const url = force ? `/api/subjects/${subjectId}/exam-predictor?refresh=true` : `/api/subjects/${subjectId}/exam-predictor`
      const res = await fetch(url)
      const data = await res.json()
      setPredictions(data)
    } catch {
      // API now returns 200 with default predictions on most failures
    } finally {
      setLoading(false)
    }
  }

  const generateQuestions = async (topic?: string, withAnswers = false) => {
    setQuestionsLoading(true)
    setSelectedTopic(topic || null)
    setShowAnswers(withAnswers)
    setExpandedAnswers({})
    try {
      const res = await fetch(`/api/subjects/${subjectId}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || undefined,
          mode: withAnswers ? "questions_answers" : "questions"
        })
      })
      const data = await res.json()
      if (data.questions) {
        setQuestions(data)
      }
    } catch (err) {
      console.error("Failed to generate questions:", err)
    } finally {
      setQuestionsLoading(false)
    }
  }

  useEffect(() => {
    fetchPredictions()
  }, [subjectId])

  const toggleAnswer = (qNum: number) => {
    setExpandedAnswers(prev => ({ ...prev, [qNum]: !prev[qNum] }))
  }

  const importanceColor = (imp: string) => {
    if (imp === "high") return "bg-[#EF4444]"
    if (imp === "medium") return "bg-[#F59E0B]"
    return "bg-[#10B981]"
  }

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      short_answer: "Short Answer",
      long_answer: "Long Answer",
      numerical: "Numerical",
      conceptual: "Conceptual",
    }
    return labels[type] || type
  }

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#7C3AED]/5 via-[#3B82F6]/5 to-[#7C3AED]/5 border-b border-[#F1F5F9]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shadow-md shadow-[#7C3AED]/20">
            <Image src="/ai-bot.png" alt="StudyBot" width={28} height={28} className="rounded-lg object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F1117] flex items-center gap-2">
              🎯 Most Likely Questions
              <span className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 text-[9px] font-bold tracking-wider">
                AI POWERED
              </span>
            </h3>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              AI generates exam-focused questions from your syllabus
            </p>
          </div>
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
            <div className="p-6 space-y-6">
              {/* Loading skeleton */}
              {loading && !predictions && (
                <div className="space-y-4 py-2">
                   <div className="h-6 w-1/3 bg-[#F1F5F9] animate-pulse rounded" />
                   <div className="space-y-2">
                      <div className="h-4 w-full bg-[#F1F5F9] animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-[#F1F5F9] animate-pulse rounded" />
                   </div>
                </div>
              )}

              {predictions && (
                <>
                  {predictions.is_default && (
                    <div className="flex items-start gap-3 rounded-xl p-4 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]">
                      <Info className="h-5 w-5 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#475569]">Limited data for precise prediction</p>
                        <p className="text-xs">📚 Upload syllabus or previous year question papers to enable high-accuracy AI exam predictions.</p>
                      </div>
                    </div>
                  )}

                  {!predictions.is_default && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full w-fit">
                       <History className="h-3 w-3" />
                       Based on: {predictions.based_on}
                    </div>
                  )}

                  {/* Topic Probability Section */}
                  <div className="space-y-4">
                    {/* High Probability */}
                    {predictions.high_probability.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-[#EF4444]" />
                          <h4 className="text-[11px] font-bold text-[#991B1B] uppercase tracking-wider">High Probability</h4>
                        </div>
                        <div className="space-y-1.5 ml-4">
                          {predictions.high_probability.map((item, i) => (
                            <div key={i} className="group flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-sm text-[#1E293B] font-medium">• {item.topic}</div>
                                <div className="text-xs text-[#64748B] ml-3 mt-0.5 opacity-80">{item.reason}</div>
                              </div>
                              <button
                                onClick={() => generateQuestions(item.topic, false)}
                                disabled={questionsLoading}
                                className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 px-2.5 py-1 rounded-lg transition-all"
                                title={`Generate questions about "${item.topic}"`}
                              >
                                <HelpCircle className="h-3 w-3" />
                                Ask Questions
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medium Probability */}
                    {predictions.medium_probability.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                          <h4 className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider">Medium Probability</h4>
                        </div>
                        <div className="space-y-1.5 ml-4">
                          {predictions.medium_probability.map((item, i) => (
                            <div key={i} className="group flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-sm text-[#334155]">• {item.topic}</div>
                                <div className="text-xs text-[#64748B] ml-3 mt-0.5 opacity-80">{item.reason}</div>
                              </div>
                              <button
                                onClick={() => generateQuestions(item.topic, false)}
                                disabled={questionsLoading}
                                className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 px-2.5 py-1 rounded-lg transition-all"
                              >
                                <HelpCircle className="h-3 w-3" />
                                Ask Questions
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low Probability */}
                    {predictions.low_probability.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                          <h4 className="text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Worth Revising</h4>
                        </div>
                        <div className="space-y-1.5 ml-4">
                          {predictions.low_probability.map((item, i) => (
                            <div key={i} className="group flex items-start justify-between gap-2">
                              <div className="text-sm text-[#475569]">• {item.topic}</div>
                              <button
                                onClick={() => generateQuestions(item.topic, false)}
                                disabled={questionsLoading}
                                className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-semibold text-[#7C3AED] bg-[#7C3AED]/8 hover:bg-[#7C3AED]/15 px-2.5 py-1 rounded-lg transition-all"
                              >
                                <HelpCircle className="h-3 w-3" />
                                Ask
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate Questions Actions */}
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => generateQuestions(undefined, false)}
                        disabled={questionsLoading}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white font-semibold px-4 py-2.5 text-xs shadow-lg shadow-[#7C3AED]/20 hover:shadow-xl hover:shadow-[#7C3AED]/30 transition-all disabled:opacity-60"
                      >
                        {questionsLoading && !selectedTopic ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Generate 6-7 Important Questions
                      </button>
                      <button
                        onClick={() => generateQuestions(undefined, true)}
                        disabled={questionsLoading}
                        className="flex items-center gap-2 rounded-xl bg-white border-2 border-[#7C3AED]/20 text-[#7C3AED] font-semibold px-4 py-2.5 text-xs hover:bg-[#7C3AED]/5 transition-all disabled:opacity-60"
                      >
                        {questionsLoading && showAnswers && !selectedTopic ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                        Questions + Answers
                      </button>
                    </div>
                  </div>

                  {/* Generated Questions Display */}
                  <AnimatePresence>
                    {questionsLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-2xl bg-gradient-to-br from-[#7C3AED]/5 to-[#3B82F6]/5 border border-[#7C3AED]/10 p-6"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shadow-md animate-pulse">
                            <Image src="/ai-bot.png" alt="Bot" width={28} height={28} className="rounded-lg object-cover" />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 text-[#7C3AED] animate-spin" />
                              <span className="text-sm font-semibold text-[#475569]">
                                StudyBot is generating {selectedTopic ? `questions about "${selectedTopic}"` : "important exam questions"}...
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <div className="h-1.5 w-12 bg-[#7C3AED]/20 rounded-full animate-pulse" />
                              <div className="h-1.5 w-8 bg-[#3B82F6]/20 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                              <div className="h-1.5 w-16 bg-[#7C3AED]/20 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {questions && !questionsLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-2xl bg-gradient-to-br from-[#FAFBFF] to-[#F5F3FF] border border-[#7C3AED]/15 overflow-hidden"
                      >
                        {/* Questions Header */}
                        <div className="px-5 py-4 bg-gradient-to-r from-[#7C3AED]/8 to-[#3B82F6]/8 border-b border-[#7C3AED]/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shadow-md shadow-[#7C3AED]/20">
                              <Image src="/ai-bot.png" alt="StudyBot" width={24} height={24} className="rounded-lg object-cover" />
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-[#1E293B] flex items-center gap-1.5">
                                📝 Generated Questions
                                <span className="text-[9px] font-bold bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.5 rounded-full">
                                  {questions.total_questions} Q's
                                </span>
                              </h4>
                              <p className="text-[10px] text-[#64748B]">
                                {selectedTopic ? `Topic: ${selectedTopic}` : "All important topics"} • {questions.based_on}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => generateQuestions(selectedTopic || undefined, !showAnswers)}
                            disabled={questionsLoading}
                            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7C3AED] bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-[#7C3AED]/20 transition-all"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {showAnswers ? "Regenerate" : "With Answers"}
                          </button>
                        </div>

                        {/* Questions List */}
                        <div className="p-5 space-y-4">
                          {questions.questions.map((q, idx) => (
                            <motion.div
                              key={q.number}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06 }}
                              className="group"
                            >
                              <div className="flex gap-3">
                                {/* Question number badge */}
                                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shadow-sm ${
                                  q.importance === "high" 
                                    ? "bg-gradient-to-br from-[#EF4444] to-[#DC2626]" 
                                    : "bg-gradient-to-br from-[#F59E0B] to-[#D97706]"
                                }`}>
                                  Q{q.number}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Question text */}
                                  <p className="text-[13px] font-medium text-[#1E293B] leading-relaxed">
                                    {q.question}
                                  </p>
                                  
                                  {/* Meta tags */}
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-white bg-gradient-to-r from-[#7C3AED]/80 to-[#3B82F6]/80 px-2 py-0.5 rounded-full">
                                      {q.topic}
                                    </span>
                                    <span className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${importanceColor(q.importance)}`}>
                                      {q.importance === "high" ? "🔴 High Priority" : "🟡 Medium Priority"}
                                    </span>
                                    {q.marks && (
                                      <span className="text-[9px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                                        {q.marks}
                                      </span>
                                    )}
                                    <span className="text-[9px] font-medium text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                                      {typeLabel(q.type)}
                                    </span>
                                  </div>

                                  {/* Answer (if available) */}
                                  {q.answer && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => toggleAnswer(q.number)}
                                        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981] hover:text-[#059669] transition-colors"
                                      >
                                        {expandedAnswers[q.number] ? (
                                          <>
                                            <ChevronUp className="h-3 w-3" />
                                            Hide Answer
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3" />
                                            Show Answer
                                          </>
                                        )}
                                      </button>
                                      <AnimatePresence>
                                        {expandedAnswers[q.number] && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="mt-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3.5">
                                              <div className="flex items-start gap-2">
                                                <div className="w-5 h-5 rounded-md bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                                                  <BookOpen className="h-3 w-3 text-white" />
                                                </div>
                                                <p className="text-[12px] text-[#065F46] leading-relaxed">
                                                  {q.answer}
                                                </p>
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Separator */}
                              {idx < questions.questions.length - 1 && (
                                <div className="border-b border-[#7C3AED]/5 mt-4" />
                              )}
                            </motion.div>
                          ))}
                        </div>

                        {/* Questions Footer */}
                        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#7C3AED]/10 flex items-center justify-between">
                          <p className="text-[10px] text-[#94A3B8] italic flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3" />
                            AI prediction only. Verify with your department faculty.
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#7C3AED] font-medium">
                            <Image src="/ai-bot.png" alt="StudyBot" width={16} height={16} className="rounded-md object-cover" />
                            Powered by StudyBot
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Disclaimer */}
                  {!questions && (
                    <div className="pt-2 border-t border-[#F1F5F9]">
                      <p className="text-[10px] text-[#94A3B8] italic text-center flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        AI prediction only. Verify with your department faculty.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
