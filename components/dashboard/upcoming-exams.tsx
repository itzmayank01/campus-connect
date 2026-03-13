"use client"

import { CalendarDays } from "lucide-react"
import { motion } from "framer-motion"

interface ExamItem {
  subject: string
  date: string
  daysLeft: number
  totalDays: number
  type?: string
}

interface UpcomingExamsProps {
  exams?: ExamItem[]
}

function getUrgencyColor(days: number) {
  if (days <= 5) return { bar: "#EF4444", dot: "#EF4444", badge: "bg-[#FEE2E2] text-[#DC2626]", pulse: true }
  if (days <= 10) return { bar: "#F5A623", dot: "#F5A623", badge: "bg-[#FEF3C7] text-[#D97706]", pulse: false }
  return { bar: "#34D399", dot: "#34D399", badge: "bg-[#D1FAE5] text-[#059669]", pulse: false }
}

export function UpcomingExams({ exams = [] }: UpcomingExamsProps) {
  const displayExams = exams.length > 0 ? exams : []

  return (
    <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg p-1.5 bg-[#4F8EF7]/8">
            <CalendarDays className="h-4 w-4 text-[#4F8EF7]" strokeWidth={1.75} />
          </div>
          <h2 className="text-sm font-semibold text-[#0F1117] font-display">Upcoming Exams</h2>
        </div>
        <button className="text-[11px] font-medium text-[#4F8EF7] hover:text-[#3B7AE0] transition-colors">
          View All
        </button>
      </div>

      {/* Timeline */}
      {displayExams.length > 0 ? (
        <div className="relative space-y-0">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[rgba(0,0,0,0.06)]" />

          {displayExams.map((exam, i) => {
            const urgency = getUrgencyColor(exam.daysLeft)
            const progress = Math.max(0, Math.min(100, ((exam.totalDays - exam.daysLeft) / exam.totalDays) * 100))

            return (
              <motion.div
                key={`${exam.subject}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="relative pl-6 py-3 group"
              >
                {/* Timeline dot */}
                <div className="absolute left-0 top-[18px]">
                  <div
                    className={`h-[10px] w-[10px] rounded-full border-2 border-white ${urgency.pulse ? "animate-pulse-dot" : ""}`}
                    style={{ backgroundColor: urgency.dot, boxShadow: `0 0 6px ${urgency.dot}40` }}
                  />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0F1117] truncate">{exam.subject}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px] text-[#6B7280]">{exam.date}</p>
                      {exam.type && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          {exam.type}
                        </span>
                      )}
                    </div>

                    {/* Urgency bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: urgency.bar }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Badge */}
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${urgency.badge}`}>
                    {exam.daysLeft}d left
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarDays className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-[#94A3B8]">No upcoming exams</p>
          <p className="text-[11px] text-[#CBD5E1] mt-0.5">Exams will appear here when scheduled</p>
        </div>
      )}
    </div>
  )
}
