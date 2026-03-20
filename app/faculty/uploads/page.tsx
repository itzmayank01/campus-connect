"use client"

import { useState, useEffect } from "react"
import { Download, Heart, Star, BarChart3, Trash2, Loader2, Plus, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UploadData {
  id: string
  originalFilename: string
  fileSize: number
  resourceType: string
  subjectName: string
  semester: number
  downloadCount: number
  likeCount: number
  averageRating: number
  isVerified: boolean
  verificationCount: number
  rejectionReason: string | null
  createdAt: string
}

export default function FacultyUploadsPage() {
  const [uploads, setUploads] = useState<UploadData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    fetch("/api/faculty/uploads")
      .then((r) => r.json())
      .then((d) => setUploads(Array.isArray(d.uploads) ? d.uploads : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredUploads = uploads
    .filter((u) => u.originalFilename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "downloads") return b.downloadCount - a.downloadCount
      if (sortBy === "rating") return b.averageRating - a.averageRating
      return 0
    })

  const getStatusBadge = (u: UploadData) => {
    if (u.verificationCount > 0 || u.isVerified) return { label: "✅ VERIFIED", bg: "#ECFDF5", color: "#22C55E" }
    if (u.rejectionReason) return { label: "❌ REJECTED", bg: "#FEF2F2", color: "#EF4444" }
    return { label: "⏳ PENDING", bg: "#FFF7ED", color: "#F97316" }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0F1117]">My Uploads</h1>
          <span className="rounded-full bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 text-xs font-bold">{uploads.length}</span>
        </div>
        <a
          href="/faculty/upload"
          className="flex items-center gap-2 rounded-xl bg-[#22C55E] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#16A34A] transition-all no-underline"
        >
          <Plus className="h-4 w-4" />
          Upload New Material
        </a>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search by filename..."
            className="pl-9 h-10 rounded-xl bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#334155]"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="downloads">Most Downloaded</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Upload Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredUploads.map((u) => {
          const status = getStatusBadge(u)
          return (
            <div key={u.id} className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9]">
                    <FileText className="h-5 w-5 text-[#6B7280]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#0F1117] truncate">{u.originalFilename}</h3>
                    <p className="text-[11px] text-[#94A3B8]">{u.subjectName} • Sem {u.semester} • {u.resourceType}</p>
                  </div>
                </div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>

              <p className="text-[11px] text-[#94A3B8] mb-3">
                Uploaded {formatDate(u.createdAt)} • {formatSize(u.fileSize)}
              </p>

              <div className="flex items-center gap-4 mb-3 text-[12px] text-[#64748B]">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {u.downloadCount} downloads</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {u.likeCount}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {u.averageRating.toFixed(1)}</span>
              </div>

              {/* Engagement bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
                  <span>Engagement</span>
                  <span>{Math.min(Math.round((u.downloadCount + u.likeCount * 3) / 3), 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#86EFAC]"
                    style={{ width: `${Math.min(Math.round((u.downloadCount + u.likeCount * 3) / 3), 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#F8FAFC]">
                <a href="/faculty/analytics" className="flex items-center gap-1 text-[11px] font-medium text-[#4F8EF7] hover:underline no-underline">
                  <BarChart3 className="h-3 w-3" /> Analytics
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {filteredUploads.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-[#94A3B8]">No uploads found</p>
        </div>
      )}
    </div>
  )
}
