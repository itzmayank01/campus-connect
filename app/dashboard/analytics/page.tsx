"use client"

import { useState, useMemo } from "react"
import { Upload, Download, Bookmark, TrendingUp, ArrowUpRight } from "lucide-react"
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap"
import { ActivityGraph } from "@/components/dashboard/activity-graph"

// Generate mock activity data for current and last month
function generateMockData(month: number, year: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const heatmap: Record<string, number> = {}
  const uploads: Record<string, number> = {}
  const downloads: Record<string, number> = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const u = Math.floor(Math.random() * 5)
    const dl = Math.floor(Math.random() * 8)
    uploads[dateStr] = u
    downloads[dateStr] = dl
    heatmap[dateStr] = u + dl + Math.floor(Math.random() * 3)
  }

  return { heatmap, uploads, downloads }
}

export default function AnalyticsPage() {
  const now = new Date()
  const [selectedPeriod, setSelectedPeriod] = useState<"this" | "last">("this")

  const displayMonth = selectedPeriod === "this" ? now.getMonth() : now.getMonth() - 1
  const displayYear = displayMonth < 0 ? now.getFullYear() - 1 : now.getFullYear()
  const adjustedMonth = displayMonth < 0 ? 11 : displayMonth

  const { heatmap, uploads, downloads } = useMemo(
    () => generateMockData(adjustedMonth, displayYear),
    [adjustedMonth, displayYear]
  )

  const totalUploads = Object.values(uploads).reduce((a, b) => a + b, 0)
  const totalDownloads = Object.values(downloads).reduce((a, b) => a + b, 0)
  const totalBookmarks = Math.floor(Math.random() * 20) + 5

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
          Analytics
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Track your learning activity
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        {/* LEFT COLUMN — Activity & Progress Tracker */}
        <div className="space-y-5">
          {/* Calendar Heatmap Card */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#0F1117] font-display">Activity Heatmap</h2>
              {/* Period toggle */}
              <div className="flex gap-1 bg-[#F1F5F9] rounded-full p-0.5">
                <button
                  onClick={() => setSelectedPeriod("this")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    selectedPeriod === "this"
                      ? "bg-white text-[#0F1117] shadow-sm"
                      : "text-[#64748B] hover:text-[#334155]"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setSelectedPeriod("last")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    selectedPeriod === "last"
                      ? "bg-white text-[#0F1117] shadow-sm"
                      : "text-[#64748B] hover:text-[#334155]"
                  }`}
                >
                  Last Month
                </button>
              </div>
            </div>

            <CalendarHeatmap
              month={adjustedMonth}
              year={displayYear}
              data={heatmap}
            />
          </div>

          {/* Activity Graph Card */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Activity Trends</h2>
            <ActivityGraph
              uploads={uploads}
              downloads={downloads}
              month={adjustedMonth}
              year={displayYear}
            />
          </div>

          {/* Stats Pills Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE]/50 px-4 py-2.5">
              <Upload className="h-4 w-4 text-[#4F8EF7]" strokeWidth={2} />
              <div>
                <span className="text-sm font-bold text-[#1E40AF] font-mono-cc">{totalUploads}</span>
                <span className="text-[11px] text-[#64748B] ml-1.5">Uploads</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]/50 px-4 py-2.5">
              <Download className="h-4 w-4 text-[#34D399]" strokeWidth={2} />
              <div>
                <span className="text-sm font-bold text-[#065F46] font-mono-cc">{totalDownloads}</span>
                <span className="text-[11px] text-[#64748B] ml-1.5">Downloads</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A]/50 px-4 py-2.5">
              <Bookmark className="h-4 w-4 text-[#F5A623]" strokeWidth={2} />
              <div>
                <span className="text-sm font-bold text-[#92400E] font-mono-cc">{totalBookmarks}</span>
                <span className="text-[11px] text-[#64748B] ml-1.5">Bookmarks</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Other analytics */}
        <div className="space-y-5">
          {/* Subject Breakdown */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Top Subjects</h2>
            <div className="space-y-3">
              {[
                { name: "Data Structures", count: 24, color: "#4F8EF7", percent: 85 },
                { name: "DBMS", count: 18, color: "#34D399", percent: 65 },
                { name: "Operating Systems", count: 12, color: "#A78BFA", percent: 45 },
                { name: "Computer Networks", count: 8, color: "#F5A623", percent: 30 },
              ].map((subject) => (
                <div key={subject.name} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[#334155]">{subject.name}</span>
                    <span className="text-xs font-bold text-[#64748B] font-mono-cc">{subject.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${subject.percent}%`, backgroundColor: subject.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semester Progress */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Semester Progress</h2>
            <div className="space-y-3">
              {[
                { sem: 1, resources: 45, total: 60, color: "#4F8EF7" },
                { sem: 2, resources: 32, total: 55, color: "#34D399" },
                { sem: 3, resources: 18, total: 50, color: "#A78BFA" },
                { sem: 4, resources: 5, total: 48, color: "#F5A623" },
              ].map((s) => (
                <div key={s.sem} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    S{s.sem}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#334155]">Semester {s.sem}</span>
                      <span className="text-[10px] font-bold text-[#64748B] font-mono-cc">{s.resources}/{s.total}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(s.resources / s.total) * 100}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Card */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5]">
                <TrendingUp className="h-5 w-5 text-[#059669]" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#0F1117] font-mono-cc">+18%</span>
                  <ArrowUpRight className="h-4 w-4 text-[#059669]" />
                </div>
                <p className="text-xs text-[#64748B]">Learning growth this month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
