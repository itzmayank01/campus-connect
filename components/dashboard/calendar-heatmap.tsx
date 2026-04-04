"use client"

import { useState, useMemo, useRef, useEffect } from "react"

interface CalendarHeatmapProps {
  data?: Record<string, number> // "YYYY-MM-DD" → activity count
  totalContributions?: number
  loading?: boolean
  onYearChange?: (year: number) => void
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Campus Connect brand palette — blue to violet gradient
function getIntensityColor(count: number): string {
  if (count === 0) return "#F1F5F9"
  if (count <= 2) return "#C7D2FE"  // indigo-200
  if (count <= 5) return "#818CF8"  // indigo-400
  if (count <= 10) return "#6366F1" // indigo-500
  return "#4338CA"                  // indigo-700
}

function getContributionText(count: number, dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
  if (count === 0) return `No activity on ${formatted}`
  return `${count} action${count !== 1 ? "s" : ""} on ${formatted}`
}

export function CalendarHeatmap({ data = {}, totalContributions = 0, loading = false, onYearChange }: CalendarHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredDay, setHoveredDay] = useState<{ date: string; x: number; y: number } | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  // Year options
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
      years.push(y)
    }
    return years
  }, [])

  // Build 52-week grid for selected year
  const { weeks, monthPositions } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let endDate: Date
    let startDate: Date

    if (selectedYear === today.getFullYear()) {
      // Current year: show last 365 days ending today
      endDate = new Date(today)
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 364)
    } else {
      // Past year: Jan 1 to Dec 31
      startDate = new Date(selectedYear, 0, 1)
      endDate = new Date(selectedYear, 11, 31)
    }

    // Align start to Sunday
    const startDow = startDate.getDay()
    if (startDow !== 0) {
      startDate.setDate(startDate.getDate() - startDow)
    }

    const weeks: { date: string; count: number; dow: number; inRange: boolean }[][] = []
    const monthPositions: { label: string; weekIdx: number }[] = []
    let currentWeek: { date: string; count: number; dow: number; inRange: boolean }[] = []
    let lastMonth = -1
    let weekIdx = 0

    const cursor = new Date(startDate)

    while (cursor <= endDate || currentWeek.length > 0) {
      if (cursor > endDate) {
        // Fill remaining days of last week
        while (currentWeek.length < 7) {
          currentWeek.push({ date: "", count: 0, dow: currentWeek.length, inRange: false })
        }
        weeks.push(currentWeek)
        break
      }

      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
      const dow = cursor.getDay() // 0=Sun

      // Track month transitions
      if (cursor.getMonth() !== lastMonth && cursor >= startDate) {
        lastMonth = cursor.getMonth()
        monthPositions.push({ label: MONTH_LABELS[lastMonth], weekIdx })
      }

      const inRange = cursor >= startDate && cursor <= endDate
      currentWeek.push({
        date: dateStr,
        count: inRange ? (data[dateStr] || 0) : 0,
        dow,
        inRange,
      })

      if (dow === 6) {
        weeks.push(currentWeek)
        currentWeek = []
        weekIdx++
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    return { weeks, monthPositions }
  }, [data, selectedYear])

  // Dynamic cell sizing
  const labelWidth = 32
  const availableWidth = Math.max(containerWidth - labelWidth - 16, 200) // 16px padding
  const cellGap = 3
  const cellSize = Math.max(Math.floor((availableWidth - (weeks.length - 1) * cellGap) / weeks.length), 8)
  const clampedCellSize = Math.min(cellSize, 16)

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    onYearChange?.(year)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#94A3B8]">Loading activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[#64748B]">
          <span className="font-bold text-[#0F1117]">{totalContributions}</span> contributions in {selectedYear === now.getFullYear() ? "the last year" : selectedYear}
        </p>
        {/* Year Selector */}
        <div className="flex gap-1">
          {yearOptions.map((year) => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                selectedYear === year
                  ? "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/25"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#334155]"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Month Labels */}
      <div className="flex" style={{ marginLeft: labelWidth + 4 }}>
        {monthPositions.map((m, i) => {
          const nextWeekIdx = i < monthPositions.length - 1 ? monthPositions[i + 1].weekIdx : weeks.length
          const span = nextWeekIdx - m.weekIdx
          return (
            <div
              key={`${m.label}-${m.weekIdx}`}
              className="text-[10px] text-[#94A3B8] font-medium shrink-0"
              style={{ width: span * (clampedCellSize + cellGap) }}
            >
              {span >= 3 ? m.label : ""}
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex mt-1">
        {/* Day Labels */}
        <div className="flex flex-col shrink-0" style={{ width: labelWidth, gap: cellGap }}>
          {[0, 1, 2, 3, 4, 5, 6].map((dowIdx) => (
            <div
              key={dowIdx}
              className="flex items-center justify-end pr-1 text-[9px] text-[#94A3B8] font-medium"
              style={{ height: clampedCellSize }}
            >
              {dowIdx % 2 === 1 ? DAY_LABELS[dowIdx] : ""}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="flex" style={{ gap: cellGap }}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col" style={{ gap: cellGap }}>
              {Array.from({ length: 7 }, (_, dowIdx) => {
                const cell = week.find((c) => c.dow === dowIdx)
                if (!cell || !cell.inRange || !cell.date) {
                  return (
                    <div
                      key={dowIdx}
                      style={{
                        width: clampedCellSize,
                        height: clampedCellSize,
                        borderRadius: 3,
                      }}
                    />
                  )
                }

                const isToday = cell.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

                return (
                  <div
                    key={dowIdx}
                    className="cursor-pointer transition-all duration-100"
                    style={{
                      width: clampedCellSize,
                      height: clampedCellSize,
                      borderRadius: 3,
                      backgroundColor: getIntensityColor(cell.count),
                      outline: isToday ? "2px solid #6366F1" : hoveredDay?.date === cell.date ? "2px solid #A5B4FC" : "none",
                      outlineOffset: -1,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredDay({ date: cell.date, x: rect.left + rect.width / 2, y: rect.top - 4 })
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
      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] text-[#CBD5E1]">
          Tracks logins, uploads, downloads & engagement
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#94A3B8]">Less</span>
          {[0, 2, 5, 10, 15].map((v) => (
            <div
              key={v}
              style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: getIntensityColor(v) }}
            />
          ))}
          <span className="text-[10px] text-[#94A3B8]">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-lg bg-[#1E293B] text-white text-[11px] font-medium shadow-xl whitespace-nowrap"
          style={{ left: hoveredDay.x, top: hoveredDay.y, transform: "translate(-50%, -100%)" }}
        >
          {getContributionText(data[hoveredDay.date] || 0, hoveredDay.date)}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1E293B]" />
        </div>
      )}
    </div>
  )
}
