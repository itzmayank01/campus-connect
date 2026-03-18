"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Subject {
  name: string
  code: string
  id?: string
}

interface SemesterData {
  number: number
  subjects: Subject[]
  notesCount: number
}

interface SemesterCardsProps {
  initialSemesters?: SemesterData[]
}

const semesterAccents: Record<number, { color: string, bg: string, text: string }> = {
  1: { color: "#4F8EF7", bg: "bg-[#4F8EF7]/6", text: "text-[#4F8EF7]" },
  2: { color: "#34D399", bg: "bg-[#34D399]/6", text: "text-[#059669]" },
  3: { color: "#A78BFA", bg: "bg-[#A78BFA]/6", text: "text-[#7C3AED]" },
  4: { color: "#F5A623", bg: "bg-[#F5A623]/6", text: "text-[#D97706]" },
  5: { color: "#EF4444", bg: "bg-[#EF4444]/6", text: "text-[#DC2626]" },
  6: { color: "#06B6D4", bg: "bg-[#06B6D4]/6", text: "text-[#0891B2]" },
  7: { color: "#F97316", bg: "bg-[#F97316]/6", text: "text-[#EA580C]" },
  8: { color: "#EC4899", bg: "bg-[#EC4899]/6", text: "text-[#DB2777]" },
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getSubjectPercent(code: string): number {
  return (hashCode(code) % 60) + 10
}

function ProgressArc({ percent, color }: { percent: number, color: string }) {
  const r = 9
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="2.5" />
      <circle
        cx="12" cy="12" r={r} fill="none"
        stroke={color} strokeWidth="2.5"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        className="transition-all duration-700"
      />
    </svg>
  )
}

function SemesterCard({ sem, accent }: { sem: SemesterData; accent: { color: string; bg: string; text: string } }) {
  const [hoverOpen, setHoverOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalResources = sem.subjects.length * 10
  const completionPercent = totalResources > 0 ? Math.min(100, (sem.notesCount / totalResources) * 100) : 0

  // Open instantly on hover, close with a small delay to allow cursor to move to popup
  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setHoverOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setHoverOpen(false)
    }, 150)
  }, [])

  return (
    <div
      className="group/card relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Card */}
      <Link
        href={`/dashboard/semesters/${sem.number}`}
        className="relative overflow-hidden rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-sm select-none transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-[rgba(0,0,0,0.1)] h-full flex flex-col no-underline block"
      >
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: accent.color }} />

        <span
          className="absolute -right-2 -bottom-4 text-[80px] font-bold font-display leading-none pointer-events-none select-none"
          style={{ color: accent.color, opacity: 0.04 }}
        >
          {sem.number}
        </span>

        <div className="relative p-4 flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/card:scale-110", accent.bg)}>
              <BookOpen className={cn("h-5 w-5", accent.text)} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F1117] text-sm tracking-tight">Semester {sem.number}</h3>
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">{sem.notesCount} resources</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 flex-1">
            {sem.subjects.length > 0 ? (
              sem.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject.code}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F3F9] px-2 py-1 text-[10px] font-medium text-[#374151] border border-transparent h-fit"
                >
                  <ProgressArc percent={getSubjectPercent(subject.code)} color={accent.color} />
                  <span className="truncate max-w-[100px]">{subject.name}</span>
                </span>
              ))
            ) : (
              <span className="text-[10px] text-[#6B7280] italic opacity-50 py-1">No subjects listed</span>
            )}
            {sem.subjects.length > 3 && (
              <span className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold h-fit", accent.bg, accent.text)}>
                +{sem.subjects.length - 3} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-auto">
            <div className="flex-1 h-1 rounded-full bg-[rgba(0,0,0,0.05)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPercent}%`, backgroundColor: accent.color }}
              />
            </div>
            <span className="text-[9px] font-semibold text-[#6B7280] font-mono-cc whitespace-nowrap">
              {sem.notesCount}/{totalResources}
            </span>
          </div>
        </div>
      </Link>

      {/* Hover Board — appears instantly on hover, with invisible bridge to prevent flicker */}
      {hoverOpen && sem.subjects.length > 0 && (
        <>
          {/* Invisible bridge between card and popup to keep hover alive */}
          <div className="absolute left-full bottom-0 w-4 h-full z-40" />
          <div className="absolute left-full bottom-0 ml-4 w-80 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.08)] shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between" style={{ backgroundColor: `${accent.color}08` }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <BookOpen className={cn("h-4 w-4", accent.text)} strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] block leading-none mb-1">Curriculum</span>
                    <span className="text-sm font-bold text-[#0F1117] leading-none font-display">Semester {sem.number}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#6B7280] bg-white/80 px-2 py-0.5 rounded-full border border-[rgba(0,0,0,0.06)]">
                  {sem.subjects.length} Subjects
                </span>
              </div>
              <div className="p-3 grid gap-1 max-h-[350px] overflow-y-auto scrollbar-hide">
                {sem.subjects.map((sub) => (
                  <Link
                    key={sub.code}
                    href={sub.id ? `/dashboard/subjects/${sub.id}` : `/dashboard/subjects`}
                    className="group/item flex items-center gap-3 w-full p-2.5 rounded-xl text-left transition-all hover:bg-[#F1F3F9] no-underline"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F3F9] border border-[rgba(0,0,0,0.04)] group-hover/item:border-[#4F8EF7]/20 transition-colors">
                      <BookOpen className={cn("h-4 w-4", accent.text)} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#0F1117] group-hover/item:text-[#4F8EF7] transition-colors break-words">{sub.name}</div>
                      <div className="text-[10px] font-medium text-[#6B7280] uppercase tracking-tight">{sub.code}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#4F8EF7] opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function SemesterCards({ initialSemesters = [] }: SemesterCardsProps) {
  const [filter, setFilter] = useState("current")
  const displaySemesters = filter === "current" ? initialSemesters.slice(0, 4) : initialSemesters

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F1117] font-display">Semester Resources</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-sm font-medium text-[#0F1117] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 cursor-pointer appearance-none pr-8 transition-shadow hover:shadow-md"
          id="semester-filter"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.25em 1.25em",
          }}
        >
          <option value="current">Current Semester ▾</option>
          <option value="all">All Semesters</option>
        </select>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        {displaySemesters.map((sem) => {
          const accent = semesterAccents[sem.number] || semesterAccents[1]
          return <SemesterCard key={sem.number} sem={sem} accent={accent} />
        })}
      </div>
    </div>
  )
}
