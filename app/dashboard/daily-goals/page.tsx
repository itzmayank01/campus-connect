import { DailyGoals } from "@/components/dashboard/daily-goals"

export const metadata = {
  title: "Daily Goals | Campus Connect",
  description: "Plan and track your daily study goals and tasks.",
}

export default function DailyGoalsPage() {
  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1117] font-display">
          Daily Goals
        </h1>
        <p className="text-sm text-[#6B7280]">
          Plan your goals day by day, track your progress, and stay ahead of your schedule.
        </p>
      </div>

      <DailyGoals />
    </div>
  )
}
