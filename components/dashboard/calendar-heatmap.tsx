"use client"

import { useState, useMemo } from "react"

interface CalendarHeatmapProps {
  month?: number // 0-indexed
  year?: number
  data?: Record<string, number> // "YYYY-MM-DD" → activity count
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

function getIntensityColor(count: number): string {
  if (count === 0) return "#F1F5F9"
  if (count <= 2) return "#BFDBFE"
  if (count <= 5) return "#60A5FA"
  if (count <= 10) return "#2563EB"
  return "#1D4ED8"
}

function getIntensityLabel(count: number): string {
  if (count === 0) return "No activity"
  if (count <= 2) return "Low activity"
  if (count <= 5) return "Medium activity"
  if (count <= 10) return "High activity"
  return "Peak activity"
}

export function CalendarHeatmap({ month, year, data = {} }: CalendarHeatmapProps) {
  const now = new Date()
  const displayMonth = month ?? now.getMonth()
  const displayYear = year ?? now.getFullYear()

  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const calendarData = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1)
    const lastDay = new Date(displayYear, displayMonth + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const cells: { day: number; date: string; count: number; isBlank: boolean }[] = []

    // Blank cells before first day
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: 0, date: "", count: 0, isBlank: true })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      cells.push({
        day: d,
        date: dateStr,
        count: data[dateStr] || 0,
        isBlank: false,
      })
    }

    return cells
  }, [displayMonth, displayYear, data])

  const monthName = new Date(displayYear, displayMonth).toLocaleString("en-US", { month: "long", year: "numeric" })

  const hoveredData = hoveredDay ? {
    date: new Date(hoveredDay).toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    count: data[hoveredDay] || 0,
  } : null

  return (
    <div className="relative">
      {/* Month label */}
      <p className="text-sm font-semibold text-[#334155] mb-3">{monthName}</p>

      {/* Grid */}
      <div className="flex gap-1.5">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 pt-0">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="h-7 w-4 flex items-center justify-center text-[10px] font-medium text-[#94A3B8]">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-[repeat(auto-fill,28px)] gap-1 flex-1" style={{ gridTemplateRows: "repeat(7, 28px)" }}>
          {calendarData.map((cell, i) => (
            <div
              key={i}
              className={`rounded transition-all duration-150 ${cell.isBlank ? "" : "cursor-pointer hover:ring-2 hover:ring-[#4F8EF7]/30"}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                backgroundColor: cell.isBlank ? "transparent" : getIntensityColor(cell.count),
              }}
              onMouseEnter={(e) => {
                if (!cell.isBlank) {
                  setHoveredDay(cell.date)
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltipPos({ x: rect.left + 14, y: rect.top - 8 })
                }
              }}
              onMouseLeave={() => setHoveredDay(null)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-[#94A3B8]">Less</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <div
            key={v}
            className="rounded"
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: getIntensityColor(v) }}
          />
        ))}
        <span className="text-[10px] text-[#94A3B8]">More</span>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg bg-[#1E293B] text-white text-xs shadow-lg"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translate(-50%, -100%)" }}
        >
          <p className="font-semibold">{hoveredData.date}</p>
          <p className="text-[#94A3B8] text-[10px]">{hoveredData.count} actions • {getIntensityLabel(hoveredData.count)}</p>
        </div>
      )}
    </div>
  )
}
