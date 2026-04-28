"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export function DailyGoalCard() {
  const [totalTasks, setTotalTasks] = useState(0)

  useEffect(() => {
    const loadGoals = () => {
      try {
        const stored = localStorage.getItem("campus-connect-daily-goals")
        if (stored) {
          const parsed = JSON.parse(stored)
          let count = 0
          for (const key in parsed) {
            count += parsed[key].length
          }
          setTotalTasks(count)
        }
      } catch (e) {}
    }
    
    loadGoals()
    
    // Optional: add storage event listener if goals are updated in another tab
    window.addEventListener("storage", loadGoals)
    return () => window.removeEventListener("storage", loadGoals)
  }, [])

  return (
    <Link href="/dashboard/daily-goals" className="rounded-xl bg-[#4B73E2]/40 backdrop-blur-sm p-4 flex-1 md:flex-none min-w-[120px] self-stretch flex flex-col justify-between hover:bg-[#4B73E2]/60 transition-colors cursor-pointer">
      <p className="text-xs text-[#E0E7FF] mb-1">Total Goals</p>
      <p className="text-3xl font-bold tracking-tight">{totalTasks} tasks</p>
    </Link>
  )
}
