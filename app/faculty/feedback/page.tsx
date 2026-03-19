"use client"

import { useState, useEffect } from "react"
import { Loader2, Star, MessageSquare, ThumbsUp, Flag } from "lucide-react"

interface FeedbackItem {
  id: string
  rating: number
  resourceName: string
  studentName: string
  createdAt: string
  reply?: string | null
  comment?: string | null
}

interface FeedbackData {
  averageRating: number
  totalRatings: number
  ratingBreakdown: Record<number, number>
  feedback: FeedbackItem[]
}

export default function FacultyFeedbackPage() {
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/faculty/feedback")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleReply = async (ratingId: string) => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/faculty/feedback/${ratingId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText }),
      })
      if (res.ok) {
        setData((prev) => prev ? {
          ...prev,
          feedback: prev.feedback.map((f) => f.id === ratingId ? { ...f, reply: replyText } : f),
        } : prev)
        setReplyingId(null)
        setReplyText("")
      }
    } catch {}
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  const d = data || { averageRating: 0, totalRatings: 0, ratingBreakdown: {}, feedback: [] }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <h1 className="text-2xl font-bold text-[#0F1117]">Student Feedback</h1>

      {/* Rating Summary */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-[#0F1117]">{d.averageRating.toFixed(1)}</p>
            <div className="flex items-center gap-0.5 mt-1 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(d.averageRating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
              ))}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">Based on {d.totalRatings} ratings</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = d.ratingBreakdown[s] || 0
              const pct = d.totalRatings > 0 ? (count / d.totalRatings) * 100 : 0
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] w-5">{s}★</span>
                  <div className="flex-1 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#94A3B8] w-16 text-right">{Math.round(pct)}% ({count})</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feedback Cards */}
      <div className="space-y-3">
        {d.feedback.length > 0 ? d.feedback.map((f) => (
          <div key={f.id} className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= f.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className="text-xs text-[#94A3B8]">{f.studentName || "Anonymous Student"}</span>
              </div>
              <span className="text-[10px] text-[#94A3B8]">{new Date(f.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>

            <p className="text-xs text-[#64748B] mb-2">On: {f.resourceName}</p>

            {f.reply && (
              <div className="rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] p-3 mt-2 text-xs text-[#15803D]">
                <span className="font-semibold">Your reply:</span> {f.reply}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              {!f.reply && (
                <button
                  onClick={() => { setReplyingId(replyingId === f.id ? null : f.id); setReplyText("") }}
                  className="flex items-center gap-1 text-[11px] text-[#4F8EF7] hover:underline"
                >
                  <MessageSquare className="h-3 w-3" /> Reply
                </button>
              )}
            </div>

            {/* Reply textarea */}
            {replyingId === f.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full h-20 rounded-xl border border-[#E2E8F0] p-3 text-sm resize-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]"
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  onClick={() => handleReply(f.id)}
                  disabled={submitting || !replyText.trim()}
                  className="rounded-xl bg-[#22C55E] text-white px-4 py-2 text-sm font-semibold hover:bg-[#16A34A] disabled:opacity-50 transition-all"
                >
                  {submitting ? "Posting..." : "Post Reply"}
                </button>
              </div>
            )}
          </div>
        )) : (
          <p className="text-sm text-[#94A3B8] text-center py-12">No feedback yet. Ratings will appear here as students rate your materials.</p>
        )}
      </div>
    </div>
  )
}
