"use client"

import { useState, useEffect } from "react"
import { Loader2, Download, Heart, TrendingUp, FileText } from "lucide-react"

interface AnalyticsData {
  weeklyDownloads: Array<{ week: string; count: number }>
  weeklyLikes: Array<{ week: string; count: number }>
  subjectBreakdown: Array<{ name: string; count: number; color: string }>
  topMaterials: Array<{ name: string; downloads: number; likes: number; rating: number }>
}

export default function FacultyAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/faculty/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  const d = data || {
    weeklyDownloads: [],
    weeklyLikes: [],
    subjectBreakdown: [],
    topMaterials: [],
  }

  const maxDl = Math.max(...d.weeklyDownloads.map((w) => w.count), 1)
  const maxLk = Math.max(...d.weeklyLikes.map((w) => w.count), 1)
  const totalSubject = d.subjectBreakdown.reduce((s, x) => s + x.count, 0) || 1
  const colors = ["#22C55E", "#4F8EF7", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316"]

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-[#0F1117]">Analytics</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Downloads Chart */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-4 w-4 text-[#22C55E]" />
            <h2 className="text-sm font-bold text-[#0F1117]">Downloads per Week</h2>
          </div>
          <div className="flex items-end gap-2 h-40">
            {d.weeklyDownloads.length > 0 ? d.weeklyDownloads.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#94A3B8] font-medium">{w.count}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#22C55E] to-[#86EFAC] transition-all duration-300"
                  style={{ height: `${(w.count / maxDl) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[9px] text-[#94A3B8]">{w.week}</span>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] w-full text-center">No data yet</p>
            )}
          </div>
        </div>

        {/* Likes Chart */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-4 w-4 text-[#EF4444]" />
            <h2 className="text-sm font-bold text-[#0F1117]">Likes per Week</h2>
          </div>
          <div className="flex items-end gap-2 h-40">
            {d.weeklyLikes.length > 0 ? d.weeklyLikes.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#94A3B8] font-medium">{w.count}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#EF4444] to-[#FCA5A5] transition-all duration-300"
                  style={{ height: `${(w.count / maxLk) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[9px] text-[#94A3B8]">{w.week}</span>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] w-full text-center">No data yet</p>
            )}
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-bold text-[#0F1117] mb-4">Subject Breakdown</h2>
          <div className="space-y-3">
            {d.subjectBreakdown.length > 0 ? d.subjectBreakdown.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-[#334155] font-medium">{s.name}</span>
                  <span className="text-[#94A3B8]">{s.count} uploads ({Math.round((s.count / totalSubject) * 100)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(s.count / totalSubject) * 100}%`, background: colors[i % colors.length] }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] text-center py-4">No uploads yet</p>
            )}
          </div>
        </div>

        {/* Top Materials */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-bold text-[#0F1117] mb-4">Top 5 Performing Materials</h2>
          <div className="space-y-2">
            {d.topMaterials.length > 0 ? d.topMaterials.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                <span className="text-sm font-bold text-[#94A3B8] w-6">{i + 1}</span>
                <FileText className="h-4 w-4 text-[#6B7280]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F1117] truncate">{m.name}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                  <span>↓{m.downloads}</span>
                  <span>❤️{m.likes}</span>
                  <span>⭐{m.rating.toFixed(1)}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] text-center py-4">No materials yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
