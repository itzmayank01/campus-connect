"use client"

import { useEffect, useRef, useState } from "react"
import { FolderOpen, BookOpen, FileText, ArrowUpRight, Upload } from "lucide-react"
import { motion, useInView } from "framer-motion"

interface StatsCardsProps {
  stats?: {
    totalResources: number
    totalSubjects: number
    totalNotes: number
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

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" className="opacity-20">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M0 28 L10 22 L20 25 L30 18 L40 20 L50 12 L60 14 L70 6 L80 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M0 28 L10 22 L20 25 L30 18 L40 20 L50 12 L60 14 L70 6 L80 8 L80 32 L0 32 Z"
        fill={`url(#spark-${color.replace('#','')})`}
      />
    </svg>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  const resources = useCountUp(stats?.totalResources || 0)
  const subjects = useCountUp(stats?.totalSubjects || 0)
  const notes = useCountUp(stats?.totalNotes || 0)

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {/* Card 1: Total Resources */}
      <motion.div
        ref={resources.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="relative overflow-hidden rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] p-5 shadow-sm group hover:shadow-lg hover:shadow-[#4F8EF7]/8 transition-all duration-300"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-[#6B7280] tracking-wide">Total Resources</p>
            <p className="text-4xl font-bold tracking-tight text-[#0F1117] font-mono-cc leading-none mt-1">
              {resources.count}+
            </p>
            <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-[#34D399]/10 px-2 py-0.5 text-[10px] font-semibold text-[#059669] w-fit">
              <ArrowUpRight className="h-3 w-3" />
              0 New
            </span>
          </div>
          <div className="flex items-center justify-center rounded-xl p-3 bg-[#4F8EF7]/8 shadow-[0_0_20px_rgba(79,142,247,0.1)]">
            <FolderOpen className="h-5 w-5 text-[#4F8EF7]" strokeWidth={1.75} />
          </div>
        </div>
        <div className="absolute bottom-2 right-3">
          <Sparkline color="#4F8EF7" />
        </div>
      </motion.div>

      {/* Card 2: Total Subjects — Green tint */}
      <motion.div
        ref={subjects.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] p-5 shadow-sm group hover:shadow-lg hover:shadow-[#34D399]/8 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#34D399]/[0.03] to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-[#6B7280] tracking-wide">Total Subjects</p>
            <p className="text-4xl font-bold tracking-tight text-[#0F1117] font-mono-cc leading-none mt-1">
              {subjects.count}
            </p>
            <p className="text-[11px] font-medium text-[#6B7280] mt-2">Core • Specializations</p>
          </div>
          <div className="flex items-center justify-center rounded-xl p-3 bg-[#34D399]/8 shadow-[0_0_20px_rgba(52,211,153,0.1)]">
            <BookOpen className="h-5 w-5 text-[#059669]" strokeWidth={1.75} />
          </div>
        </div>
        <div className="relative mt-4 h-1 w-full rounded-full bg-[rgba(0,0,0,0.05)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#34D399] to-[#34D399]/60"
            initial={{ width: 0 }}
            animate={{ width: "50%" }}
            transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Card 3: Notes & PDFs — Lavender tint / Empty state */}
      <motion.div
        ref={notes.ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm group transition-all duration-300 ${
          (stats?.totalNotes || 0) === 0
            ? "bg-white border-dashed border-[rgba(167,139,250,0.3)] hover:border-[rgba(167,139,250,0.5)] hover:shadow-lg hover:shadow-[#A78BFA]/8"
            : "bg-white border-[rgba(0,0,0,0.06)] hover:shadow-lg hover:shadow-[#A78BFA]/8"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#A78BFA]/[0.02] to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-[#6B7280] tracking-wide">Notes & PDFs</p>
            <p className="text-4xl font-bold tracking-tight text-[#0F1117] font-mono-cc leading-none mt-1">
              {notes.count}
            </p>
            {(stats?.totalNotes || 0) === 0 ? (
              <button className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                <Upload className="h-3 w-3" />
                Be the first to upload →
              </button>
            ) : (
              <p className="text-[11px] font-medium text-[#6B7280] mt-2">Across all semesters</p>
            )}
          </div>
          <div className="flex items-center justify-center rounded-xl p-3 bg-[#A78BFA]/8 shadow-[0_0_20px_rgba(167,139,250,0.1)]">
            <FileText className="h-5 w-5 text-[#7C3AED]" strokeWidth={1.75} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
