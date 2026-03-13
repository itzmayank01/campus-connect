"use client"

import { useEffect, useRef, useMemo } from "react"

interface ActivityGraphProps {
  uploads?: Record<string, number>   // "YYYY-MM-DD" → count
  downloads?: Record<string, number> // "YYYY-MM-DD" → count
  month?: number
  year?: number
}

export function ActivityGraph({ uploads = {}, downloads = {}, month, year }: ActivityGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const now = new Date()
  const displayMonth = month ?? now.getMonth()
  const displayYear = year ?? now.getFullYear()
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()

  const { uploadData, downloadData, maxVal } = useMemo(() => {
    const up: number[] = []
    const down: number[] = []
    let mx = 1

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const u = uploads[dateStr] || 0
      const dl = downloads[dateStr] || 0
      up.push(u)
      down.push(dl)
      mx = Math.max(mx, u, dl)
    }

    return { uploadData: up, downloadData: down, maxVal: mx }
  }, [uploads, downloads, displayMonth, displayYear, daysInMonth])

  const W = 600
  const H = 180
  const PX = 40 // left padding for Y labels
  const PY = 20 // top/bottom padding
  const graphW = W - PX - 10
  const graphH = H - PY * 2

  function toPoint(dayIndex: number, value: number): [number, number] {
    const x = PX + (dayIndex / (daysInMonth - 1)) * graphW
    const y = PY + graphH - (value / maxVal) * graphH
    return [x, y]
  }

  function buildSmoothPath(data: number[]): string {
    if (data.length < 2) return ""
    const points = data.map((v, i) => toPoint(i, v))
    let d = `M${points[0][0]},${points[0][1]}`

    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]
      const [x1, y1] = points[i]
      const cx = (x0 + x1) / 2
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }

    return d
  }

  function buildAreaPath(data: number[]): string {
    const linePath = buildSmoothPath(data)
    if (!linePath) return ""
    const points = data.map((v, i) => toPoint(i, v))
    const lastX = points[points.length - 1][0]
    const firstX = points[0][0]
    return `${linePath} L${lastX},${PY + graphH} L${firstX},${PY + graphH} Z`
  }

  // Y-axis labels
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal]

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#4F8EF7]" />
          <span className="text-xs font-medium text-[#64748B]">Uploads</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
          <span className="text-xs font-medium text-[#64748B]">Downloads</span>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = PY + graphH - (tick / maxVal) * graphH
          return (
            <g key={tick}>
              <line x1={PX} y1={y} x2={W - 10} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={PX - 8} y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="9" fontFamily="inherit">
                {tick}
              </text>
            </g>
          )
        })}

        {/* X-axis labels (every 5 days) */}
        {Array.from({ length: daysInMonth }, (_, i) => i).filter(i => (i + 1) % 5 === 0 || i === 0).map((i) => {
          const [x] = toPoint(i, 0)
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="inherit">
              {i + 1}
            </text>
          )
        })}

        {/* Download area + line */}
        <path d={buildAreaPath(downloadData)} fill="#34D399" fillOpacity="0.1" />
        <path
          d={buildSmoothPath(downloadData)}
          fill="none"
          stroke="#34D399"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        {downloadData.map((v, i) => {
          const [cx, cy] = toPoint(i, v)
          return v > 0 ? (
            <circle key={`d-${i}`} cx={cx} cy={cy} r="2.5" fill="#34D399" stroke="white" strokeWidth="1.5" />
          ) : null
        })}

        {/* Upload area + line */}
        <path d={buildAreaPath(uploadData)} fill="#4F8EF7" fillOpacity="0.1" />
        <path
          d={buildSmoothPath(uploadData)}
          fill="none"
          stroke="#4F8EF7"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        {uploadData.map((v, i) => {
          const [cx, cy] = toPoint(i, v)
          return v > 0 ? (
            <circle key={`u-${i}`} cx={cx} cy={cy} r="2.5" fill="#4F8EF7" stroke="white" strokeWidth="1.5" />
          ) : null
        })}
      </svg>
    </div>
  )
}
