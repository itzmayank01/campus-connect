"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, BookOpen, ChevronRight, Loader2, ArrowRight } from "lucide-react"

interface SubjectData {
  id: string
  name: string
  code: string
  semesterNumber?: number
  credits?: number
  category?: string
  resourceCount: number
}

const semesterAccents: Record<number, { color: string; gradient: string }> = {
  1: { color: "#4F8EF7", gradient: "from-[#4F8EF7] to-[#60A5FA]" },
  2: { color: "#34D399", gradient: "from-[#34D399] to-[#6EE7B7]" },
  3: { color: "#A78BFA", gradient: "from-[#A78BFA] to-[#C4B5FD]" },
  4: { color: "#F5A623", gradient: "from-[#F5A623] to-[#FCD34D]" },
  5: { color: "#EF4444", gradient: "from-[#EF4444] to-[#F87171]" },
  6: { color: "#06B6D4", gradient: "from-[#06B6D4] to-[#67E8F9]" },
  7: { color: "#F97316", gradient: "from-[#F97316] to-[#FB923C]" },
  8: { color: "#EC4899", gradient: "from-[#EC4899] to-[#F472B6]" },
}

export default function SemestersPage() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<SubjectData[]>([])

  useEffect(() => {
    // Single fast API call instead of 8 separate calls
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubjects(data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group subjects by semester number
  const grouped: Record<number, SubjectData[]> = {}
  for (const s of subjects) {
    const sem = s.semesterNumber || 1
    if (!grouped[sem]) grouped[sem] = []
    grouped[sem].push(s)
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5A623]/20 to-[#FCD34D]/20 shadow-sm">
          <Calendar className="h-6 w-6 text-[#F5A623]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            Semesters
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Browse resources by semester
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((semNum) => {
            const accent = semesterAccents[semNum] || semesterAccents[1]
            const semSubjects = grouped[semNum] || []
            const totalResources = semSubjects.reduce((a, s) => a + s.resourceCount, 0)

            return (
              <Link
                key={semNum}
                href={`/dashboard/semesters/${semNum}`}
                className="group relative rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 no-underline"
              >
                {/* Color bar */}
                <div className="h-2 w-full" style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)` }} />

                {/* Large number watermark */}
                <span
                  className="absolute -right-2 -bottom-4 text-[80px] font-bold font-display leading-none pointer-events-none select-none"
                  style={{ color: accent.color, opacity: 0.04 }}
                >
                  {semNum}
                </span>

                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)` }}
                    >
                      S{semNum}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0F1117] font-display">Semester {semNum}</h3>
                      <p className="text-[11px] text-[#64748B]">
                        {semSubjects.length} subjects • {totalResources} resources
                      </p>
                    </div>
                  </div>

                  {/* Preview of top subjects */}
                  {semSubjects.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      {semSubjects.slice(0, 3).map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 text-xs text-[#64748B]">
                          <BookOpen className="h-3 w-3 shrink-0" style={{ color: accent.color }} />
                          <span className="truncate">{sub.name}</span>
                          {sub.resourceCount > 0 && (
                            <span className="ml-auto shrink-0 text-[10px] font-bold" style={{ color: accent.color }}>
                              {sub.resourceCount}
                            </span>
                          )}
                        </div>
                      ))}
                      {semSubjects.length > 3 && (
                        <p className="text-[10px] font-semibold" style={{ color: accent.color }}>
                          +{semSubjects.length - 3} more subjects
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                    <span
                      className="text-xs font-bold"
                      style={{ color: totalResources > 0 ? accent.color : "#94A3B8" }}
                    >
                      {totalResources > 0 ? `${totalResources} resources` : "No resources yet"}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-[#CBD5E1] group-hover:translate-x-1 transition-transform"
                      style={{ color: accent.color }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
