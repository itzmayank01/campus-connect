"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { GraduationCap, BookOpen, ChevronDown, ChevronRight, FileText, Video, HelpCircle, Loader2, Search } from "lucide-react"

interface SubjectData {
  id: string
  name: string
  code: string
  semesterId: string
  semesterNumber?: number
  credits?: number
  category?: string
  resourceCount: number
}

const semesterAccents: Record<number, { color: string; bg: string; text: string; gradient: string }> = {
  1: { color: "#4F8EF7", bg: "bg-[#4F8EF7]/6", text: "text-[#4F8EF7]", gradient: "from-[#4F8EF7] to-[#60A5FA]" },
  2: { color: "#34D399", bg: "bg-[#34D399]/6", text: "text-[#059669]", gradient: "from-[#34D399] to-[#6EE7B7]" },
  3: { color: "#A78BFA", bg: "bg-[#A78BFA]/6", text: "text-[#7C3AED]", gradient: "from-[#A78BFA] to-[#C4B5FD]" },
  4: { color: "#F5A623", bg: "bg-[#F5A623]/6", text: "text-[#D97706]", gradient: "from-[#F5A623] to-[#FCD34D]" },
  5: { color: "#EF4444", bg: "bg-[#EF4444]/6", text: "text-[#DC2626]", gradient: "from-[#EF4444] to-[#F87171]" },
  6: { color: "#06B6D4", bg: "bg-[#06B6D4]/6", text: "text-[#0891B2]", gradient: "from-[#06B6D4] to-[#67E8F9]" },
  7: { color: "#F97316", bg: "bg-[#F97316]/6", text: "text-[#EA580C]", gradient: "from-[#F97316] to-[#FB923C]" },
  8: { color: "#EC4899", bg: "bg-[#EC4899]/6", text: "text-[#DB2777]", gradient: "from-[#EC4899] to-[#F472B6]" },
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSemesters, setExpandedSemesters] = useState<Set<number>>(new Set([1, 2, 3, 4]))
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubjects(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleSemester = (num: number) => {
    setExpandedSemesters((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  // Group subjects by semester
  const grouped = subjects.reduce<Record<number, SubjectData[]>>((acc, s) => {
    const sem = s.semesterNumber || 1
    if (!acc[sem]) acc[sem] = []
    acc[sem].push(s)
    return acc
  }, {})

  // Filter by search
  const filteredGrouped = Object.entries(grouped).reduce<Record<number, SubjectData[]>>(
    (acc, [sem, subs]) => {
      const filtered = subs.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (filtered.length > 0) acc[parseInt(sem)] = filtered
      return acc
    },
    {}
  )

  const totalResourceCount = subjects.reduce((acc, s) => acc + s.resourceCount, 0)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#A78BFA]/20 shadow-sm">
            <GraduationCap className="h-6 w-6 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
              Subjects
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              {subjects.length} subjects • {totalResourceCount} resources
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            className="w-full sm:w-72 rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 8 }, (_, i) => i + 1).map((semNum) => {
            const accent = semesterAccents[semNum] || semesterAccents[1]
            const semSubjects = filteredGrouped[semNum] || []
            const isExpanded = expandedSemesters.has(semNum)
            const totalSemResources = semSubjects.reduce((a, s) => a + s.resourceCount, 0)

            return (
              <div
                key={semNum}
                className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200"
              >
                {/* Semester Header */}
                <button
                  onClick={() => toggleSemester(semNum)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-all duration-150"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm"
                    style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)` }}
                  >
                    S{semNum}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-bold text-[#0F1117] font-display">
                      Semester {semNum}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {semSubjects.length} subject{semSubjects.length !== 1 ? "s" : ""} • {totalSemResources} resource{totalSemResources !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold"
                    style={{ backgroundColor: `${accent.color}15`, color: accent.color }}
                  >
                    {totalSemResources} resources
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-[#94A3B8]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-[#94A3B8]" />
                  )}
                </button>

                {/* Subjects List */}
                {isExpanded && (
                  <div className="border-t border-[#F1F5F9]">
                    {semSubjects.length > 0 ? (
                      <div className="divide-y divide-[#F1F5F9]">
                        {semSubjects.map((subject) => (
                          <Link
                            key={subject.id}
                            href={`/dashboard/subjects/${subject.id}`}
                            className="group flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-all duration-150 no-underline"
                          >
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${accent.color}10` }}
                            >
                              <BookOpen className="h-4 w-4" style={{ color: accent.color }} strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#0F1117] group-hover:text-[#4F8EF7] transition-colors truncate">
                                {subject.name}
                              </p>
                              <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide font-medium">
                                {subject.code}
                                {subject.credits ? ` • ${subject.credits} credits` : ""}
                              </p>
                            </div>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: subject.resourceCount > 0 ? `${accent.color}15` : "#F1F5F9",
                                color: subject.resourceCount > 0 ? accent.color : "#94A3B8",
                              }}
                            >
                              {subject.resourceCount} resource{subject.resourceCount !== 1 ? "s" : ""}
                            </span>
                            <ChevronRight className="h-4 w-4 text-[#CBD5E1] group-hover:text-[#4F8EF7] transition-colors" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-8 text-center">
                        <GraduationCap className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
                        <p className="text-sm text-[#94A3B8]">
                          {searchQuery ? "No subjects match your search" : "No subjects in this semester"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
