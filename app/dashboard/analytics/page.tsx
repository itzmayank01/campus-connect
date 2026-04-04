"use client"

import { useState, useEffect, useMemo } from "react"
import { Upload, Download, Bookmark, TrendingUp, ArrowUpRight, Loader2, BarChart3 } from "lucide-react"
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap"
import { ActivityGraph } from "@/components/dashboard/activity-graph"

interface ActivityDay {
  activityDate: string
  totalPointsToday: number
  isPassiveDay: boolean
  pointsFromLogin: number
  pointsFromUploads: number
  pointsFromDownloads: number
  pointsFromLikesReceived: number
}

export default function AnalyticsPage() {
  const [activities, setActivities] = useState<ActivityDay[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarkCount, setBookmarkCount] = useState(0)

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [activityRes, bookmarkRes] = await Promise.all([
          fetch("/api/activity/heatmap"),
          fetch("/api/user/bookmarks"),
        ])

        if (activityRes.ok) {
          const data = await activityRes.json()
          if (Array.isArray(data.activities)) {
            setActivities(data.activities)
          }
        }

        if (bookmarkRes.ok) {
          const data = await bookmarkRes.json()
          if (Array.isArray(data.bookmarks)) {
            setBookmarkCount(data.bookmarks.length)
          }
        }
      } catch (e) {
        console.error("Failed to fetch analytics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Convert activities to heatmap data
  const { heatmapData, totalContributions, uploads, downloads, currentMonthUploads, currentMonthDownloads } = useMemo(() => {
    const heatmap: Record<string, number> = {}
    const uploads: Record<string, number> = {}
    const downloads: Record<string, number> = {}
    let total = 0
    let monthUploads = 0
    let monthDownloads = 0

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    for (const a of activities) {
      const dateStr = new Date(a.activityDate).toISOString().split("T")[0]
      const count = a.totalPointsToday || 0
      heatmap[dateStr] = count
      total += count > 0 ? 1 : 0 // Count active days as contributions

      const uploadPts = a.pointsFromUploads || 0
      const downloadPts = a.pointsFromDownloads || 0
      uploads[dateStr] = uploadPts
      downloads[dateStr] = downloadPts

      // Current month stats
      const d = new Date(a.activityDate)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthUploads += uploadPts
        monthDownloads += downloadPts
      }
    }

    return {
      heatmapData: heatmap,
      totalContributions: total,
      uploads,
      downloads,
      currentMonthUploads: monthUploads,
      currentMonthDownloads: monthDownloads,
    }
  }, [activities])

  const now = new Date()

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#30A14E]/20 to-[#39D353]/20 shadow-sm">
          <BarChart3 className="h-6 w-6 text-[#30A14E]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            Analytics
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track your learning activity and contributions
          </p>
        </div>
      </div>

      {/* GitHub-style Contribution Graph — full width */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Contribution Graph</h2>
        <CalendarHeatmap
          data={heatmapData}
          totalContributions={totalContributions}
          loading={loading}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Activity Graph Card */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Activity Trends</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#4F8EF7]" />
              </div>
            ) : (
              <ActivityGraph
                uploads={uploads}
                downloads={downloads}
                month={now.getMonth()}
                year={now.getFullYear()}
              />
            )}
          </div>

          {/* Stats Pills Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]/50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8EF7]/10">
                <Upload className="h-5 w-5 text-[#4F8EF7]" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-xl font-bold text-[#1E40AF]">{loading ? "—" : currentMonthUploads}</span>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium">Uploads</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]/50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34D399]/10">
                <Download className="h-5 w-5 text-[#34D399]" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-xl font-bold text-[#065F46]">{loading ? "—" : currentMonthDownloads}</span>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium">Downloads</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]/50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5A623]/10">
                <Bookmark className="h-5 w-5 text-[#F5A623]" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-xl font-bold text-[#92400E]">{loading ? "—" : bookmarkCount}</span>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-medium">Bookmarks</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Contribution Breakdown */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Contribution Types</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const loginDays = activities.filter((a) => a.pointsFromLogin > 0).length
                  const uploadDays = activities.filter((a) => a.pointsFromUploads > 0).length
                  const downloadDays = activities.filter((a) => a.pointsFromDownloads > 0).length
                  const likeDays = activities.filter((a) => a.pointsFromLikesReceived > 0).length
                  const maxDays = Math.max(loginDays, uploadDays, downloadDays, likeDays, 1)

                  const items = [
                    { name: "Login Activity", count: loginDays, color: "#4F8EF7", percent: (loginDays / maxDays) * 100 },
                    { name: "Uploads", count: uploadDays, color: "#8B5CF6", percent: (uploadDays / maxDays) * 100 },
                    { name: "Downloads", count: downloadDays, color: "#34D399", percent: (downloadDays / maxDays) * 100 },
                    { name: "Likes Received", count: likeDays, color: "#F5A623", percent: (likeDays / maxDays) * 100 },
                  ]

                  return items.map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[#334155]">{item.name}</span>
                        <span className="text-xs font-bold text-[#64748B]">{item.count} days</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>

          {/* Streak Info */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Activity Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const activeDays = activities.filter((a) => a.totalPointsToday > 0).length
                const passiveDays = activities.filter((a) => a.isPassiveDay).length
                const totalPoints = activities.reduce((a, d) => a + d.totalPointsToday, 0)
                const avgDaily = activeDays > 0 ? Math.round(totalPoints / activeDays) : 0

                return [
                  { label: "Active Days", value: activeDays, color: "#30A14E" },
                  { label: "Passive Days", value: passiveDays, color: "#8B949E" },
                  { label: "Total Points", value: totalPoints, color: "#4F8EF7" },
                  { label: "Avg / Active Day", value: avgDaily, color: "#F5A623" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-[#F8FAFC] p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: stat.color }}>{loading ? "—" : stat.value}</div>
                    <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide mt-0.5">{stat.label}</div>
                  </div>
                ))
              })()}
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
                  <span className="text-2xl font-bold text-[#0F1117]">{totalContributions}</span>
                  <ArrowUpRight className="h-4 w-4 text-[#059669]" />
                </div>
                <p className="text-xs text-[#64748B]">Total active days this year</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
