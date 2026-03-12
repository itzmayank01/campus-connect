"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"

const allSemesters = [
  { number: 1, subjects: ["Math I", "Physics", "Chemistry"], color: "text-blue-600", bgColor: "bg-blue-100", notes: 42 },
  { number: 2, subjects: ["Math II", "BEE", "Workshop"], color: "text-emerald-600", bgColor: "bg-emerald-100", notes: 38 },
  { number: 3, subjects: ["DSA", "COA", "DBMS"], color: "text-violet-600", bgColor: "bg-violet-100", notes: 56 },
  { number: 4, subjects: ["OS", "CN", "SE"], color: "text-amber-600", bgColor: "bg-amber-100", notes: 61 },
  { number: 5, subjects: ["ML", "Compiler", "DAA"], color: "text-rose-600", bgColor: "bg-rose-100", notes: 48 },
  { number: 6, subjects: ["AI", "Cloud", "IoT"], color: "text-cyan-600", bgColor: "bg-cyan-100", notes: 35 },
  { number: 7, subjects: ["Blockchain", "DevOps"], color: "text-orange-600", bgColor: "bg-orange-100", notes: 29 },
  { number: 8, subjects: ["Project", "Seminar"], color: "text-pink-600", bgColor: "bg-pink-100", notes: 18 },
]

export function SemesterCards() {
  const [filter, setFilter] = useState("current")

  const displaySemesters = filter === "current" ? allSemesters.slice(0, 4) : allSemesters

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Semester Resources</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none pr-8"
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {displaySemesters.map((sem) => (
          <button
            key={sem.number}
            className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${sem.bgColor}`}>
                <BookOpen className={`h-5 w-5 ${sem.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Semester {sem.number}</h3>
                <p className="text-xs text-muted-foreground">{sem.notes} notes</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sem.subjects.map((subject) => (
                <span
                  key={subject}
                  className="rounded-lg bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {subject}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
