"use client"

import { useState, useMemo } from "react"

interface GitHubHeatmapProps {
  data?: Record<string, number> // "YYYY-MM-DD" → activity count
  totalContributions?: number
  loading?: boolean
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getIntensityColor(count: number): string {
  if (count === 0) return "#161B22"
  if (count <= 2) return "#0E4429"
  if (count <= 5) return "#006D32"
  if (count <= 10) return "#26A641"
  return "#39D353"
}

function getIntensityColorLight(count: number): string {
  if (count === 0) return "#EBEDF0"
  if (count <= 2) return "#9BE9A8"
  if (count <= 5) return "#40C463"
  if (count <= 10) return "#30A14E"
  return "#216E39"
}

function getContributionText(count: number, date: string): string {
  const d = new Date(date + "T00:00:00")
  const formatted = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  if (count === 0) return `No contributions on ${formatted}`
  return `${count} contribution${count !== 1 ? "s" : ""} on ${formatted}`
}

export function CalendarHeatmap({ data = {}, totalContributions = 0, loading = false }: GitHubHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Build 52-week grid ending today
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Go back ~52 weeks from today (to the nearest Sunday)
    const start = new Date(today)
    start.setDate(start.getDate() - 364) // 52 weeks = 364 days
    // Align to Sunday
    const startDow = start.getDay()
    start.setDate(start.getDate() - startDow)

    const weeks: { date: string; count: number; dayOfWeek: number }[][] = []
    const monthPositions: { label: string; col: number }[] = []
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = []
    let lastMonth = -1

    const cursor = new Date(start)
    let weekIndex = 0

    while (cursor <= today || currentWeek.length > 0) {
      if (cursor > today && currentWeek.length > 0) {
        weeks.push(currentWeek)
        break
      }

      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
      const dayOfWeek = cursor.getDay() // 0=Sun, 6=Sat

      // Track month labels
      if (cursor.getMonth() !== lastMonth) {
        lastMonth = cursor.getMonth()
        monthPositions.push({ label: MONTH_LABELS[lastMonth], col: weekIndex })
      }

      currentWeek.push({
        date: dateStr,
        count: data[dateStr] || 0,
        dayOfWeek,
      })

      // End of week (Saturday)
      if (dayOfWeek === 6) {
        weeks.push(currentWeek)
        currentWeek = []
        weekIndex++
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { weeks, monthLabels: monthPositions }
  }, [data])

  const hoveredData = hoveredDay
    ? { text: getContributionText(data[hoveredDay] || 0, hoveredDay) }
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-[#30A14E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#C9D1D9]">
          <span className="text-[#E6EDF3] font-bold">{totalContributions}</span> contributions in the last year
        </p>
      </div>

      {/* Graph Container */}
      <div className="rounded-xl border border-[#30363D] bg-[#0D1117] p-4 overflow-x-auto">
        {/* Month labels */}
        <div className="flex ml-[30px] mb-1">
          {monthLabels.map((m, i) => {
            const nextCol = i < monthLabels.length - 1 ? monthLabels[i + 1].col : weeks.length
            const span = nextCol - m.col
            if (span < 2) return null // Skip if too narrow
            return (
              <div
                key={`${m.label}-${m.col}`}
                className="text-[10px] text-[#8B949E] font-medium"
                style={{
                  position: "relative",
                  left: `${m.col * 14}px`,
                  width: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </div>
            )
          })}
        </div>

        {/* Grid with day labels */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-1 shrink-0" style={{ width: 28 }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-end pr-1 text-[10px] text-[#8B949E] font-medium"
                style={{ height: 12 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div className="flex gap-[2px]">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const cell = week.find((c) => c.dayOfWeek === dayIdx)
                  if (!cell) {
                    return (
                      <div
                        key={dayIdx}
                        style={{ width: 12, height: 12, borderRadius: 2 }}
                      />
                    )
                  }
                  return (
                    <div
                      key={dayIdx}
                      className="cursor-pointer transition-all duration-100"
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: getIntensityColor(cell.count),
                        outline: hoveredDay === cell.date ? "2px solid #58A6FF" : "none",
                        outlineOffset: -1,
                      }}
                      onMouseEnter={(e) => {
                        setHoveredDay(cell.date)
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltipPos({ x: rect.left + 6, y: rect.top - 4 })
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[10px] text-[#8B949E] mr-0.5">Less</span>
          {[0, 2, 5, 10, 15].map((v) => (
            <div
              key={v}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: getIntensityColor(v),
              }}
            />
          ))}
          <span className="text-[10px] text-[#8B949E] ml-0.5">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-md bg-[#6E7681] text-white text-[11px] font-semibold shadow-lg whitespace-nowrap"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translate(-50%, -100%)" }}
        >
          {hoveredData.text}
          <div
            className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#6E7681]"
          />
        </div>
      )}
    </div>
  )
}
