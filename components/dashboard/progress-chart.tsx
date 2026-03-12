"use client"

import { TrendingUp } from "lucide-react"

const data = [
  { week: "W1", hours: 12 },
  { week: "W2", hours: 18 },
  { week: "W3", hours: 15 },
  { week: "W4", hours: 24 },
]

export function ProgressChart() {
  const maxHours = Math.max(...data.map((d) => d.hours))
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0)
  const prevTotal = 58
  const growthPercent = Math.round(((totalHours - prevTotal) / prevTotal) * 100)

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm h-fit">
      <h2 className="font-semibold text-foreground mb-1">Progress Overview</h2>

      {/* Line-style dots chart */}
      <div className="mt-4 relative">
        <svg viewBox="0 0 200 80" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          <line x1="20" y1="10" x2="190" y2="10" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
          <line x1="20" y1="30" x2="190" y2="30" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
          <line x1="20" y1="50" x2="190" y2="50" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
          <line x1="20" y1="70" x2="190" y2="70" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />

          {/* Area fill */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.2 260)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="oklch(0.55 0.2 260)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d={`M${20 + 0 * 56.6},${70 - (data[0].hours / maxHours) * 60} ${20 + 1 * 56.6},${70 - (data[1].hours / maxHours) * 60} ${20 + 2 * 56.6},${70 - (data[2].hours / maxHours) * 60} ${20 + 3 * 56.6},${70 - (data[3].hours / maxHours) * 60} L${20 + 3 * 56.6},70 L20,70 Z`}
            fill="url(#areaGrad)"
          />

          {/* Line */}
          <polyline
            points={data
              .map((d, i) => `${20 + i * 56.6},${70 - (d.hours / maxHours) * 60}`)
              .join(" ")}
            fill="none"
            stroke="oklch(0.55 0.2 260)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {data.map((d, i) => (
            <circle
              key={d.week}
              cx={20 + i * 56.6}
              cy={70 - (d.hours / maxHours) * 60}
              r="3.5"
              fill="oklch(0.55 0.2 260)"
              stroke="white"
              strokeWidth="1.5"
            />
          ))}

          {/* Week labels */}
          {data.map((d, i) => (
            <text
              key={`label-${d.week}`}
              x={20 + i * 56.6}
              y={80}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity="0.4"
              fontSize="6"
              fontFamily="inherit"
            >
              {d.week}
            </text>
          ))}
        </svg>
      </div>

      {/* Growth indicator */}
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg font-bold">+{growthPercent}%</span>
        </div>
        <span className="text-xs text-muted-foreground">Study Growth</span>
      </div>
    </div>
  )
}
