"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  BookOpen,
  FileText,
  Video,
  HelpCircle,
  Download,
  Loader2,
  Search,
  Clock,
  Play,
  ExternalLink,
  Archive,
  Star,
  Heart,
  Shield,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"

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
  uploader?: { id: string; name: string | null; email: string; image?: string | null; avatarUrl?: string | null }
  subject?: { id: string; name: string; code: string }
}

const tabs = [
  { label: "All", value: "all", icon: BookOpen, color: "bg-[#4F8EF7]" },
  { label: "Notes", value: "NOTES", icon: FileText, color: "bg-[#3B82F6]" },
  { label: "Question Papers", value: "QUESTION_PAPERS", icon: HelpCircle, color: "bg-[#8B5CF6]" },
  { label: "Videos", value: "VIDEOS", icon: Video, color: "bg-[#EF4444]" },
  { label: "Syllabus", value: "SYLLABUS", icon: BookOpen, color: "bg-[#10B981]" },
  { label: "Reference", value: "REFERENCE", icon: BookOpen, color: "bg-[#F59E0B]" },
]

const typeIcons: Record<string, { bg: string; icon: typeof FileText; text: string }> = {
  NOTES: { bg: "bg-blue-50", icon: FileText, text: "text-blue-500" },
  QUESTION_PAPERS: { bg: "bg-purple-50", icon: HelpCircle, text: "text-purple-500" },
  VIDEOS: { bg: "bg-red-50", icon: Video, text: "text-red-500" },
  SYLLABUS: { bg: "bg-emerald-50", icon: BookOpen, text: "text-emerald-500" },
  REFERENCE: { bg: "bg-amber-50", icon: BookOpen, text: "text-amber-500" },
}

export default function StudyMaterialsPage() {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [youtubeModal, setYoutubeModal] = useState<ResourceItem | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch resources from unified endpoint
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab !== "all") params.set("type", activeTab)
      if (debouncedSearch) params.set("search", debouncedSearch)
      params.set("limit", "50")

      const res = await fetch(`/api/resources?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setResources(data.resources || [])
      } else {
        // Fallback: try fetching from subjects endpoint (legacy)
        try {
          const subjectsRes = await fetch("/api/subjects")
          if (subjectsRes.ok) {
            const subjects = await subjectsRes.json()
            if (Array.isArray(subjects)) {
              const allResources: ResourceItem[] = []
              const subjectsToFetch = subjects.slice(0, 20)
              await Promise.all(
                subjectsToFetch.map(async (sub: any) => {
                  try {
                    const r = await fetch(`/api/subjects/${sub.id}/resources`)
                    const d = await r.json()
                    if (Array.isArray(d.resources)) {
                      allResources.push(
                        ...d.resources.map((r: any) => ({
                          ...r,
                          subject: { id: sub.id, name: sub.name, code: sub.code },
                        }))
                      )
                    }
                  } catch {}
                })
              )
              allResources.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              setResources(allResources)
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error("Failed to fetch resources:", e)
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—"
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getTypeConfig = (resourceType: string) => {
    return typeIcons[resourceType] || { bg: "bg-slate-50", icon: FileText, text: "text-slate-500" }
  }

  const handleDownload = async (resource: ResourceItem) => {
    try {
      const res = await fetch(`/api/resources/${resource.id}/download`)
      const data = await res.json()
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank")
      } else if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank")
      }
    } catch {
      if (resource.resourceUrl) {
        window.open(resource.resourceUrl, "_blank")
      }
    }
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
              Browse all resources uploaded by students & faculty
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
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.value
                ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#334155]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      {!loading && resources.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#64748B]">
            Showing <span className="font-semibold text-[#0F1117]">{resources.length}</span> resource{resources.length !== 1 ? "s" : ""}
          </span>
          {debouncedSearch && (
            <span className="text-sm text-[#64748B]">
              for &quot;<span className="font-medium text-[#4F8EF7]">{debouncedSearch}</span>&quot;
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
          <p className="text-sm text-[#94A3B8]">Loading materials...</p>
        </div>
      ) : resources.length > 0 ? (
        <div className="space-y-3">
          {resources.map((resource) => {
            const typeConfig = getTypeConfig(resource.resourceType)
            const TypeIcon = typeConfig.icon
            const displayTitle =
              resource.mimeType === "youtube"
                ? resource.youtubeTitle || resource.originalFilename
                : resource.originalFilename

            return (
              <div
                key={resource.id}
                className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#E2E8F0] transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail / Icon */}
                  {resource.mimeType === "youtube" && resource.youtubeThumbnail ? (
                    <div
                      className="relative shrink-0 w-[120px] h-[68px] rounded-xl overflow-hidden bg-black cursor-pointer"
                      onClick={() => setYoutubeModal(resource)}
                    >
                      <img
                        src={resource.youtubeThumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${typeConfig.bg} transition-colors`}
                    >
                      {resource.originalFilename?.endsWith(".zip") ? (
                        <Archive className={`h-6 w-6 ${typeConfig.text}`} />
                      ) : (
                        <TypeIcon className={`h-6 w-6 ${typeConfig.text}`} />
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#0F1117] truncate">
                        {displayTitle}
                      </h3>
                      {resource.isVerified && (
                        <span className="flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          <Shield className="h-2.5 w-2.5" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {resource.subject && (
                        <Link
                          href={`/dashboard/subjects/${resource.subject.id}`}
                          className="text-[11px] text-[#4F8EF7] font-semibold no-underline hover:underline bg-[#4F8EF7]/5 rounded px-1.5 py-0.5"
                        >
                          {resource.subject.code}
                        </Link>
                      )}
                      <span className="text-[11px] text-[#94A3B8]">
                        • {resource.uploader?.name || resource.uploader?.email?.split("@")[0] || "Unknown"}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        • {formatDate(resource.createdAt)}
                      </span>
                      {resource.fileSize > 0 && (
                        <span className="text-[11px] text-[#94A3B8]">
                          • {formatFileSize(resource.fileSize)}
                        </span>
                      )}
                      {resource.resourceType && (
                        <span className="text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] rounded px-1.5 py-0.5">
                          {resource.resourceType.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {resource.downloadCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#64748B]">
                          <Download className="h-2.5 w-2.5" /> {resource.downloadCount}
                        </span>
                      )}
                      {resource.likeCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-rose-500 font-medium">
                          <Heart className="h-2.5 w-2.5 fill-rose-500" /> {resource.likeCount}
                        </span>
                      )}
                      {resource.averageRating > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                          <Star className="h-2.5 w-2.5 fill-amber-400" /> {resource.averageRating.toFixed(1)}
                        </span>
                      )}
                      {!resource.isVerified && (
                        <span className="flex items-center gap-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] px-1.5 py-0.5 text-[9px] font-medium">
                          <Clock className="h-2.5 w-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {resource.mimeType === "youtube" ? (
                      <>
                        <button
                          onClick={() => setYoutubeModal(resource)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm"
                        >
                          <Play className="h-3.5 w-3.5" /> Watch
                        </button>
                        <a
                          href={resource.resourceUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 no-underline transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDownload(resource)}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center">
          <BookOpen className="h-12 w-12 text-[#E2E8F0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#334155]">No materials found</h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            {searchQuery
              ? "Try a different search query"
              : "No materials have been uploaded yet. Be the first to share!"}
          </p>
        </div>
      )}

      {/* YouTube Modal */}
      {youtubeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setYoutubeModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#0F1117] truncate">
                {youtubeModal.youtubeTitle}
              </h3>
              <button
                onClick={() => setYoutubeModal(null)}
                className="text-[#94A3B8] hover:text-[#0F1117] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={
                  youtubeModal.youtubePlaylistId
                    ? `https://www.youtube.com/embed/videoseries?list=${youtubeModal.youtubePlaylistId}`
                    : `https://www.youtube.com/embed/${youtubeModal.youtubeVideoId}`
                }
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="flex items-center justify-between p-4 border-t border-[#F1F5F9]">
              <p className="text-sm text-[#64748B]">
                {youtubeModal.youtubeChannel && `Channel: ${youtubeModal.youtubeChannel}`}
              </p>
              <button
                onClick={() => setYoutubeModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
