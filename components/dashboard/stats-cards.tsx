"use client"

import { useEffect, useRef, useState } from "react"
import { Folder, BookOpen, FileText, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { motion, useInView } from "framer-motion"

interface StatsCardsProps {
  stats?: {
    totalResources: number
    totalSubjects: number
    totalNotes: number
    upcomingExams?: number
  }
}

function useCountUp(end: number, duration = 800) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, end, duration])

  return { ref, count }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const resources = useCountUp(stats?.totalResources || 156)
  const subjects = useCountUp(stats?.totalSubjects || 24)
  const notes = useCountUp(stats?.totalNotes || 89)
  const exams = useCountUp(stats?.upcomingExams || 7)

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {/* Card 1: Total Resources */}
      <motion.div
        ref={resources.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="rounded-2xl bg-[#F8F9FB] p-5 transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] text-[#1F2937]">
            <Folder className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#F0FDF4] px-2 py-1 rounded-full">
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} /> 12
          </div>
        </div>
        <p className="text-sm font-medium text-[#4B5563] mb-2">Total Resources</p>
        <div className="flex items-baseline gap-1">
          <p className="text-4xl font-bold text-[#0F1117] font-display tracking-tight">{resources.count}</p>
          <span className="text-sm text-[#94A3B8] font-medium">+</span>
        </div>
        <p className="text-xs text-[#94A3B8] mt-4 font-medium">Core & Specializations</p>
      </motion.div>

      {/* Card 2: Total Subjects */}
      <motion.div
        ref={subjects.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-[#F8F9FB] p-5 transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] text-[#1F2937]">
            <BookOpen className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#F0FDF4] px-2 py-1 rounded-full">
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} /> 3
          </div>
        </div>
        <p className="text-sm font-medium text-[#4B5563] mb-2">Total Subjects</p>
        <p className="text-4xl font-bold text-[#0F1117] font-display tracking-tight">{subjects.count}</p>
        <p className="text-xs text-[#94A3B8] mt-4 font-medium">Active Subjects</p>
      </motion.div>

      {/* Card 3: Notes & PDFs */}
      <motion.div
        ref={notes.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-[#F8F9FB] p-5 transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] text-[#1F2937]">
            <FileText className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#F0FDF4] px-2 py-1 rounded-full">
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} /> 5
          </div>
        </div>
        <p className="text-sm font-medium text-[#4B5563] mb-2">Notes & PDFs</p>
        <p className="text-4xl font-bold text-[#0F1117] font-display tracking-tight">{notes.count}</p>
        <p className="text-xs text-[#94A3B8] mt-4 font-medium">Across all semesters</p>
      </motion.div>

      {/* Card 4: Upcoming Exams */}
      <motion.div
        ref={exams.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-2xl bg-[#F8F9FB] p-5 transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-2.5 rounded-xl bg-[#FEF2F2] text-[#1F2937]">
            <Calendar className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#EF4444] bg-[#FEF2F2] px-2 py-1 rounded-full">
            <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} /> 2
          </div>
        </div>
        <p className="text-sm font-medium text-[#4B5563] mb-2">Upcoming Exams</p>
        <p className="text-4xl font-bold text-[#0F1117] font-display tracking-tight">{exams.count}</p>
        <p className="text-xs text-[#94A3B8] mt-4 font-medium">Next 30 days</p>
      </motion.div>
    </div>
  )
}
