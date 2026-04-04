"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
    const uploadsMap: Record<string, number> = {}
    const downloadsMap: Record<string, number> = {}
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
      if (count > 0) total++

      uploadsMap[dateStr] = a.pointsFromUploads || 0
      downloadsMap[dateStr] = a.pointsFromDownloads || 0

      const d = new Date(a.activityDate)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthUploads += a.pointsFromUploads || 0
        monthDownloads += a.pointsFromDownloads || 0
      }
    }

    return {
      heatmapData: heatmap,
      totalContributions: total,
      uploads: uploadsMap,
      downloads: downloadsMap,
      currentMonthUploads: monthUploads,
      currentMonthDownloads: monthDownloads,
    }
  }, [activities])

  const now = new Date()

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#818CF8]/20 shadow-sm">
          <BarChart3 className="h-6 w-6 text-[#6366F1]" />
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

      {/* Contribution Graph — full width */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
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
                <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
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

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white border border-[#F1F5F9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] mb-2">
                <Upload className="h-5 w-5 text-[#6366F1]" strokeWidth={1.75} />
              </div>
              <div className="text-2xl font-bold text-[#0F1117]">{loading ? "—" : currentMonthUploads}</div>
              <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">Uploads this month</div>
            </div>
            <div className="rounded-2xl bg-white border border-[#F1F5F9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] mb-2">
                <Download className="h-5 w-5 text-[#10B981]" strokeWidth={1.75} />
              </div>
              <div className="text-2xl font-bold text-[#0F1117]">{loading ? "—" : currentMonthDownloads}</div>
              <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">Downloads this month</div>
            </div>
            <div className="rounded-2xl bg-white border border-[#F1F5F9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF3C7] mb-2">
                <Bookmark className="h-5 w-5 text-[#F59E0B]" strokeWidth={1.75} />
              </div>
              <div className="text-2xl font-bold text-[#0F1117]">{loading ? "—" : bookmarkCount}</div>
              <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">Total Bookmarks</div>
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

                  return [
                    { name: "Login Activity", count: loginDays, color: "#6366F1", percent: (loginDays / maxDays) * 100 },
                    { name: "Uploads", count: uploadDays, color: "#8B5CF6", percent: (uploadDays / maxDays) * 100 },
                    { name: "Downloads", count: downloadDays, color: "#10B981", percent: (downloadDays / maxDays) * 100 },
                    { name: "Likes Received", count: likeDays, color: "#F59E0B", percent: (likeDays / maxDays) * 100 },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[#334155]">{item.name}</span>
                        <span className="text-xs font-bold text-[#64748B]">{item.count} days</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
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

          {/* Activity Summary */}
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h2 className="text-base font-bold text-[#0F1117] font-display mb-4">Activity Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const activeDays = activities.filter((a) => a.totalPointsToday > 0).length
                const passiveDays = activities.filter((a) => a.isPassiveDay).length
                const totalPoints = activities.reduce((a, d) => a + d.totalPointsToday, 0)
                const avgDaily = activeDays > 0 ? Math.round(totalPoints / activeDays) : 0

                return [
                  { label: "Active Days", value: activeDays, color: "#6366F1" },
                  { label: "Passive Days", value: passiveDays, color: "#94A3B8" },
                  { label: "Total Points", value: totalPoints, color: "#4F8EF7" },
                  { label: "Avg / Active Day", value: avgDaily, color: "#F59E0B" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-3.5 text-center">
                    <div className="text-2xl font-bold" style={{ color: stat.color }}>{loading ? "—" : stat.value}</div>
                    <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide mt-0.5">{stat.label}</div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Growth Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] p-6 shadow-lg shadow-[#6366F1]/15">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <TrendingUp className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">{totalContributions}</span>
                  <ArrowUpRight className="h-4 w-4 text-white/80" />
                </div>
                <p className="text-xs text-white/70">Total active days this year</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
