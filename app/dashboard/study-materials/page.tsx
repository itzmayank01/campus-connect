"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, FileText, Video, HelpCircle, Download, Eye, Loader2, Search, Heart, Star, Clock, Play, ExternalLink, Archive } from "lucide-react"

interface ResourceItem {
  id: string
  originalFilename: string
  fileSize: number
  mimeType: string
  resourceType: string
  downloadCount: number
  likeCount: number
  averageRating: number
  isVerified: boolean
  createdAt: string
  semester: number
  s3Key?: string | null
  resourceUrl?: string | null
  resourceUrlType?: string | null
  youtubeVideoId?: string | null
  youtubePlaylistId?: string | null
  youtubeThumbnail?: string | null
  youtubeTitle?: string | null
  youtubeChannel?: string | null
  uploader?: { name: string | null; email: string }
  subject?: { name: string; code: string }
}

const tabs = [
  { label: "All", value: "all", icon: BookOpen },
  { label: "Notes", value: "NOTES", icon: FileText },
  { label: "Question Papers", value: "QUESTION_PAPERS", icon: HelpCircle },
  { label: "Videos", value: "VIDEOS", icon: Video },
  { label: "Reference", value: "REFERENCE", icon: BookOpen },
]

export default function StudyMaterialsPage() {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [youtubeModal, setYoutubeModal] = useState<ResourceItem | null>(null)

  useEffect(() => {
    // Fetch all public resources
    fetch("/api/subjects")
      .then((r) => r.json())
      .then(async (subjects: any[]) => {
        if (!Array.isArray(subjects)) return

        // Fetch resources from first 20 subjects
        const allResources: ResourceItem[] = []
        const subjectsToFetch = subjects.slice(0, 20)

        await Promise.all(
          subjectsToFetch.map(async (sub: any) => {
            try {
              const res = await fetch(`/api/subjects/${sub.id}/resources`)
              const data = await res.json()
              if (Array.isArray(data.resources)) {
                allResources.push(
                  ...data.resources.map((r: any) => ({
                    ...r,
                    subject: { name: sub.name, code: sub.code },
                  }))
                )
              }
            } catch {}
          })
        )

        // Sort by newest first
        allResources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setResources(allResources)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredResources = resources.filter((r) => {
    const matchesTab = activeTab === "all" || r.resourceType === activeTab
    const matchesSearch =
      !searchQuery ||
      r.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.youtubeTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.subject?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—"
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F8EF7]/20 to-[#60A5FA]/20 shadow-sm">
            <BookOpen className="h-6 w-6 text-[#4F8EF7]" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
              Study Materials
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Browse all resources uploaded by students
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials..."
            className="w-full sm:w-72 rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.value
                ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="space-y-3">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                {resource.mimeType === "youtube" && resource.youtubeThumbnail ? (
                  <div
                    className="relative shrink-0 w-[120px] h-[68px] rounded-xl overflow-hidden bg-black cursor-pointer"
                    onClick={() => setYoutubeModal(resource)}
                  >
                    <img src={resource.youtubeThumbnail} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9]">
                    {resource.originalFilename.endsWith(".zip") ? (
                      <Archive className="h-6 w-6 text-[#6B7280]" />
                    ) : (
                      <FileText className="h-6 w-6 text-[#6B7280]" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#0F1117] truncate">
                    {resource.mimeType === "youtube" ? resource.youtubeTitle || resource.originalFilename : resource.originalFilename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {resource.subject && (
                      <Link
                        href={`/dashboard/subjects/${resource.id}`}
                        className="text-[11px] text-[#4F8EF7] font-medium no-underline hover:underline"
                      >
                        {resource.subject.code}
                      </Link>
                    )}
                    <span className="text-[11px] text-[#94A3B8]">• {resource.uploader?.name || resource.uploader?.email}</span>
                    <span className="text-[11px] text-[#94A3B8]">• {formatDate(resource.createdAt)}</span>
                    {resource.fileSize > 0 && (
                      <span className="text-[11px] text-[#94A3B8]">• {formatFileSize(resource.fileSize)}</span>
                    )}
                    {!resource.isVerified && (
                      <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] px-1.5 py-0.5 text-[9px] font-medium flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> Pending verification
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  {resource.mimeType === "youtube" ? (
                    <>
                      <button
                        onClick={() => setYoutubeModal(resource)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> Watch
                      </button>
                      <a
                        href={resource.resourceUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 no-underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </>
                  ) : (
                    <a
                      href={`/api/resources/${resource.id}/download`}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 transition-all no-underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center">
          <BookOpen className="h-12 w-12 text-[#E2E8F0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#334155]">No materials found</h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            {searchQuery ? "Try a different search query" : "No materials have been uploaded yet"}
          </p>
        </div>
      )}

      {/* YouTube Modal */}
      {youtubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setYoutubeModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#0F1117] truncate">{youtubeModal.youtubeTitle}</h3>
              <button onClick={() => setYoutubeModal(null)} className="text-[#94A3B8] hover:text-[#0F1117]">✕</button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={youtubeModal.youtubePlaylistId ? `https://www.youtube.com/embed/videoseries?list=${youtubeModal.youtubePlaylistId}` : `https://www.youtube.com/embed/${youtubeModal.youtubeVideoId}`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="flex items-center justify-between p-4 border-t border-[#F1F5F9]">
              <p className="text-sm text-[#64748B]">{youtubeModal.youtubeChannel && `Channel: ${youtubeModal.youtubeChannel}`}</p>
              <button onClick={() => setYoutubeModal(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
