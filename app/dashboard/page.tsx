import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SemesterCards } from "@/components/dashboard/semester-cards"
import { StudyMaterials } from "@/components/dashboard/study-materials"
import { UpcomingExams } from "@/components/dashboard/upcoming-exams"
import { ProgressChart } from "@/components/dashboard/progress-chart"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Student"

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your semester-wise study resources
          </p>
        </div>
        <Button className="gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90" id="upload-material-btn">
          <Upload className="h-4 w-4" />
          Upload Material
        </Button>
      </div>

      {/* Stats + Upcoming Exams Row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <StatsCards />
        <UpcomingExams />
      </div>

      {/* Semester Resources */}
      <SemesterCards />

      {/* Study Materials + Progress Chart */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <StudyMaterials />
        <ProgressChart />
      </div>
    </div>
  )
}
