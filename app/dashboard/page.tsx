import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SemesterCards } from "@/components/dashboard/semester-cards"
import { StudyMaterials } from "@/components/dashboard/study-materials"
import { UpcomingExams } from "@/components/dashboard/upcoming-exams"
import { StudyCalendar } from "@/components/dashboard/study-calendar"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TrendingResources } from "@/components/dashboard/trending-resources"
import { Upload } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh"
import { DailyGoalCard } from "@/components/dashboard/daily-goal-card"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch data with graceful fallbacks — handles missing columns / migration not yet applied
  let totalSubjects = 0
  let totalNotes = 0
  let totalResources = 0
  let semesters: any[] = []
  let allNotes: any[] = []
  let allResources: any[] = []

  try {
    [totalSubjects, totalNotes] = await Promise.all([
      prisma.subject.count(),
      prisma.note.count(),
    ])
  } catch {
    // DB query failed — use defaults
  }

  try {
    totalResources = await prisma.resource.count({ where: { isPublic: true, deletedAt: null } })
  } catch {
    totalResources = 0
  }

  try {
    semesters = await prisma.semester.findMany({
      include: {
        subjects: {
          where: { specializationId: null },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                notes: true,
                resources: true,
              }
            }
          }
        }
      },
      orderBy: { number: "asc" },
    })
  } catch {
    semesters = []
  }

  try {
    allNotes = await prisma.note.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        subject: true
      }
    })
  } catch {
    allNotes = []
  }

  try {
    allResources = await prisma.resource.findMany({
      take: 10,
      where: { isPublic: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        uploader: { select: { name: true, email: true } }
      }
    })
  } catch {
    allResources = []
  }

  // Fetch upcoming exams from DB (graceful fallback if table doesn't exist yet)
  let formattedExams: { id?: string; subject: string; date: string; time?: string; daysLeft: number; totalDays: number; type: string }[] = []
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
        id: exam.id,
        subject: exam.subject?.name || exam.name,
        date: examDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
        time: examDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
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
    totalResources: totalNotes + totalResources,
    totalSubjects,
    totalNotes: totalNotes + totalResources
  }

  const formattedSemesters = semesters.map((sem: any) => ({
    number: sem.number,
    subjects: sem.subjects.map((s: any) => ({
      name: s.name,
      code: s.code,
      id: s.id,
    })),
    notesCount: sem.subjects.reduce((acc: number, s: any) => {
      const notesCount = s._count?.notes || 0
      const resourcesCount = s._count?.resources || 0
      return acc + notesCount + resourcesCount
    }, 0)
  }))

  // Merge notes and resources into a unified materials list
  const formattedNotes = [
    ...allNotes.map((note: any) => ({
      id: note.id,
      title: note.title,
      subject: note.subject.code,
      type: note.type.toLowerCase() as any,
      format: (note.fileUrl || "").split('.').pop()?.toUpperCase() || "PDF",
      size: "0.5 MB",
      semester: note.subject.semesterId,
      downloads: 0
    })),
    ...allResources.map((resource: any) => ({
      id: resource.id,
      title: resource.originalFilename,
      subject: resource.subject.code,
      type: resource.resourceType.toLowerCase() as any,
      format: resource.mimeType === 'youtube' ? 'YT' : resource.originalFilename.split('.').pop()?.toUpperCase() || "FILE",
      size: resource.fileSize > 0 ? `${(resource.fileSize / (1024 * 1024)).toFixed(1)} MB` : "—",
      semester: resource.semester,
      downloads: resource.downloadCount,
      uploaderName: resource.uploader?.name || "Unknown",
      isYoutube: resource.mimeType === 'youtube',
    }))
  ]

  // Pull active user from Postgres rather than stale Supabase JWT metadata
  let dbUser = null
  let userStreak = null
  if (user) {
    try {
      dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, name: true, semester: true }
      })
      if (dbUser) {
        userStreak = await prisma.userStreak.findUnique({
          where: { userId: dbUser.id }
        })
      }
    } catch {}
  }

  const studyTimeTodayMins = userStreak?.studyTimeToday || 0
  const studyTimeWeekMins = userStreak?.studyTimeWeek || 0
  const weeklyGoalMins = userStreak?.weeklyGoal || 2400

  const todayHours = Math.floor(studyTimeTodayMins / 60)
  const todayMins = studyTimeTodayMins % 60
  const weekHours = Math.floor(studyTimeWeekMins / 60)
  const goalHours = Math.floor(weeklyGoalMins / 60)

  const displayName = dbUser?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student"
  const currentSemester = dbUser?.semester ? `Semester ${dbUser.semester}` : "Select Semester in Profile"

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <RealtimeRefresh />

      {/* Welcome Banner */}
      <div className="rounded-2xl bg-[#1E50D7] p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between shadow-md">
        <div className="space-y-2 mb-6 md:mb-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-display">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-[#E0E7FF] text-sm sm:text-base">
            You're on a 7-day study streak. {currentSemester} • Keep it up!
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Study Time */}
          <div className="rounded-xl bg-[#4B73E2]/40 backdrop-blur-sm p-4 flex-1 md:flex-none min-w-[120px]">
            <p className="text-xs text-[#E0E7FF] mb-1 leading-tight">Study<br/>Time<br/>Today</p>
            <p className="text-3xl font-bold mt-2 tracking-tight whitespace-pre-line">
              {todayHours > 0 ? `${todayHours}h\n${todayMins}m` : `${todayMins}m`}
            </p>
          </div>
          {/* Daily Goals count (formerly Week Goal) */}
          <DailyGoalCard />
        </div>
      </div>

      <QuickActions />

      {/* Main content + Right panel */}
      <div className="grid gap-5 lg:grid-cols-[1fr_280px] items-start">
        {/* Left: Main content column */}
        <div className="space-y-5">
          {/* Row 1: 4 Stat Cards */}
          <StatsCards stats={{...stats, upcomingExams: formattedExams.length}} />

          {/* Row 2: Study Materials — full width */}
          <StudyMaterials initialMaterials={formattedNotes} />



          {/* Row 4: Semester Resources */}
          <SemesterCards initialSemesters={formattedSemesters} />
        </div>

        {/* Right: Upcoming Exams + Trending */}
        <div className="space-y-5">
          <StudyCalendar semesters={semesters} userSemester={dbUser?.semester} />
          <UpcomingExams exams={formattedExams} />
          <TrendingResources />
        </div>
      </div>
    </div>
  )
}
