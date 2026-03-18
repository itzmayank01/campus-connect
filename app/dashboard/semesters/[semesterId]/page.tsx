"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BookOpen, ArrowLeft, Loader2, Upload, ChevronRight, Calendar, Clock,
} from "lucide-react"

interface SubjectWithCounts {
  id: string
  name: string
  code: string
  credits: number
  totalResources: number
  notesCount: number
  questionPapersCount: number
  videosCount: number
  referenceCount: number
  lastUpload: string | null
}

const semesterAccents: Record<number, { color: string }> = {
  1: { color: "#4F8EF7" },
  2: { color: "#34D399" },
  3: { color: "#A78BFA" },
  4: { color: "#F5A623" },
  5: { color: "#EF4444" },
  6: { color: "#06B6D4" },
  7: { color: "#F97316" },
  8: { color: "#EC4899" },
}

export default function SemesterDetailPage({ params }: { params: Promise<{ semesterId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [semester, setSemester] = useState<any>(null)
  const [subjects, setSubjects] = useState<SubjectWithCounts[]>([])
  const [totalResources, setTotalResources] = useState(0)
  const [loading, setLoading] = useState(true)

  const semNum = parseInt(resolvedParams.semesterId)
  const accent = semesterAccents[semNum] || semesterAccents[1]

  useEffect(() => {
    fetch(`/api/semesters/${resolvedParams.semesterId}/subjects`)
      .then((r) => r.json())
      .then((data) => {
        if (data.semester) setSemester(data.semester)
        if (Array.isArray(data.subjects)) setSubjects(data.subjects)
        setTotalResources(data.totalResources || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resolvedParams.semesterId])

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/semesters")}
        className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F8EF7] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Semesters
      </button>

      {/* Banner */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)` }}
      >
        <div className="px-6 py-8 text-white relative">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[120px] font-bold font-display leading-none opacity-10 select-none pointer-events-none">
            {semNum}
          </span>
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-6 w-6" />
            <h1 className="text-[28px] font-bold tracking-tight font-display">
              Semester {semNum}
            </h1>
          </div>
          <p className="text-white/80 text-sm">
            {subjects.length} subjects • {totalResources} total resources
          </p>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/dashboard/subjects/${subject.id}`}
            className={`group rounded-2xl bg-white border shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 no-underline ${
              subject.totalResources > 0 ? "border-[#F1F5F9]" : "border-[#F1F5F9] opacity-75"
            }`}
          >
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent.color}15` }}
                >
                  <BookOpen className="h-5 w-5" style={{ color: accent.color }} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#0F1117] group-hover:text-[#4F8EF7] transition-colors line-clamp-2">
                    {subject.name}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] uppercase tracking-wide font-medium mt-0.5">
                    {subject.code}
                  </p>
                </div>
              </div>

              {subject.totalResources > 0 ? (
                <>
                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] mb-3">
                    {subject.notesCount > 0 && <span>{subject.notesCount} Note{subject.notesCount !== 1 ? "s" : ""}</span>}
                    {subject.questionPapersCount > 0 && <span>• {subject.questionPapersCount} PYQ{subject.questionPapersCount !== 1 ? "s" : ""}</span>}
                    {subject.videosCount > 0 && <span>• {subject.videosCount} Video{subject.videosCount !== 1 ? "s" : ""}</span>}
                    {subject.referenceCount > 0 && <span>• {subject.referenceCount} Ref</span>}
                  </div>
                  {subject.lastUpload && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                      <Clock className="h-3 w-3" />
                      Last upload: {formatTimeAgo(subject.lastUpload)}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#94A3B8] italic">No resources yet</p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F1F5F9]">
                <span
                  className="text-xs font-semibold"
                  style={{ color: subject.totalResources > 0 ? accent.color : "#94A3B8" }}
                >
                  {subject.totalResources > 0 ? "View Resources →" : "Upload first →"}
                </span>
                <ChevronRight className="h-4 w-4 text-[#CBD5E1] group-hover:translate-x-1 group-hover:text-[#4F8EF7] transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center">
          <BookOpen className="h-12 w-12 text-[#E2E8F0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#334155]">No subjects found</h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            This semester doesn&apos;t have any subjects yet.
          </p>
        </div>
      )}
    </div>
  )
}
