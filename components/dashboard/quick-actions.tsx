"use client"

import { Zap, Clock, BookText, Target } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()
  return (
    <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0F1117] font-display mb-5">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Start Study Session */}
        <button className="flex flex-col items-start justify-between min-h-[110px] rounded-xl bg-[#2563EB] p-4 text-left text-white shadow-lg shadow-[#2563EB]/20 transition-transform hover:-translate-y-1 hover:shadow-[#2563EB]/40">
          <Zap className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-sm font-semibold leading-tight pr-4">Start Study Session</span>
        </button>

        {/* Schedule Exam */}
        <button className="flex flex-col items-start justify-between min-h-[110px] rounded-xl bg-[#A855F7] p-4 text-left text-white shadow-lg shadow-[#A855F7]/20 transition-transform hover:-translate-y-1 hover:shadow-[#A855F7]/40">
          <Clock className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-sm font-semibold leading-tight pr-4">Schedule Exam</span>
        </button>

        {/* Upload Material */}
        <button className="flex flex-col items-start justify-between min-h-[110px] rounded-xl bg-[#10B981] p-4 text-left text-white shadow-lg shadow-[#10B981]/20 transition-transform hover:-translate-y-1 hover:shadow-[#10B981]/40">
          <BookText className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-sm font-semibold leading-tight pr-4">Upload Material</span>
        </button>

        {/* Set Goal */}
        <button 
          onClick={() => {
            router.push('/dashboard/daily-goals')
          }}
          className="flex flex-col items-start justify-between min-h-[110px] rounded-xl bg-[#F97316] p-4 text-left text-white shadow-lg shadow-[#F97316]/20 transition-transform hover:-translate-y-1 hover:shadow-[#F97316]/40"
        >
          <Target className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-sm font-semibold leading-tight pr-4">Set Goal</span>
        </button>
      </div>
    </div>
  )
}
