import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SemesterCards } from "@/components/dashboard/semester-cards"
import { StudyMaterials } from "@/components/dashboard/study-materials"
import { UpcomingExams } from "@/components/dashboard/upcoming-exams"
import { ForYouFeed } from "@/components/dashboard/for-you-feed"
import { TrendingResources } from "@/components/dashboard/trending-resources"
import { Upload } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [totalSubjects, totalNotes, semesters, allNotes] = await Promise.all([
    prisma.subject.count(),
    prisma.note.count(),
    prisma.semester.findMany({
      include: {
        subjects: {
          where: { specializationId: null },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { notes: true }
            }
          }
        }
      },
      orderBy: { number: "asc" },
    }),
    prisma.note.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        subject: true
      }
    })
  ])

  // Fetch upcoming exams from DB (graceful fallback if table doesn't exist yet)
  let formattedExams: { subject: string; date: string; daysLeft: number; totalDays: number; type: string }[] = []
  try {
    const now = new Date()
    const exams = await (prisma as any).exam.findMany({
      where: {
        date: { gte: now },
      },
      orderBy: { date: "asc" },
      take: 6,
      include: {
        subject: true,
      },
    })

    formattedExams = exams.map((exam: any) => {
      const examDate = new Date(exam.date)
      const diffMs = examDate.getTime() - now.getTime()
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      return {
        subject: exam.subject?.name || exam.name,
        date: examDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
        daysLeft,
        totalDays: 30,
        type: exam.type || "endterm",
      }
    })
  } catch {
    // Exam table doesn't exist yet or query failed — use empty array
    formattedExams = []
  }

  const stats = {
    totalResources: totalSubjects + totalNotes,
    totalSubjects,
    totalNotes
  }

  const formattedSemesters = semesters.map(sem => ({
    number: sem.number,
    subjects: sem.subjects.map(s => ({ name: s.name, code: s.code })),
    notesCount: sem.subjects.reduce((acc, s) => acc + s._count.notes, 0)
  }))

  const formattedNotes = allNotes.map(note => ({
    id: note.id,
    title: note.title,
    subject: note.subject.code,
    type: note.type.toLowerCase() as any,
    format: (note.fileUrl || "").split('.').pop()?.toUpperCase() || "PDF",
    size: "0.5 MB",
    semester: note.subject.semesterId,
    downloads: 0
  }))

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Student"

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <RealtimeRefresh />

      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {dateStr} • Semester 4
          </p>
        </div>
        <button
          className="relative overflow-hidden gap-2 rounded-xl bg-[#4F8EF7] text-white font-medium px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 transition-all duration-200 hover:bg-[#3B7AE0] flex items-center group sm:hidden"
          id="upload-material-btn"
        >
          <Upload className="h-4 w-4" />
          Upload Material
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer pointer-events-none" />
        </button>
      </div>

      {/* Main content + Right panel */}
      <div className="grid gap-5 lg:grid-cols-[1fr_280px] items-start">
        {/* Left: Main content column */}
        <div className="space-y-5">
          {/* Row 1: 3 Stat Cards */}
          <StatsCards stats={stats} />

          {/* Row 2: Study Materials — full width */}
          <StudyMaterials initialMaterials={formattedNotes} />

          {/* Row 3: For You — AI Recommendations */}
          <ForYouFeed />

          {/* Row 4: Semester Resources */}
          <SemesterCards initialSemesters={formattedSemesters} />
        </div>

        {/* Right: Upcoming Exams + Trending */}
        <div className="space-y-5">
          <UpcomingExams exams={formattedExams} />
          <TrendingResources />
        </div>
      </div>
    </div>
  )
}
