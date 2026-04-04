"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Bookmark,
  BookmarkCheck,
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
  Trash2,
  X,
  Filter,
} from "lucide-react"

interface BookmarkedResource {
  bookmarkId: string
  bookmarkedAt: string
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

const filterTabs = [
  { label: "All", value: "all", icon: BookmarkCheck },
  { label: "Notes", value: "NOTES", icon: FileText },
  { label: "Question Papers", value: "QUESTION_PAPERS", icon: HelpCircle },
  { label: "Videos", value: "VIDEOS", icon: Video },
  { label: "Syllabus", value: "SYLLABUS", icon: BookOpen },
  { label: "Reference", value: "REFERENCE", icon: BookOpen },
]

const typeIcons: Record<string, { bg: string; icon: typeof FileText; text: string; label: string }> = {
  NOTES: { bg: "bg-blue-50", icon: FileText, text: "text-blue-500", label: "Notes" },
  QUESTION_PAPERS: { bg: "bg-purple-50", icon: HelpCircle, text: "text-purple-500", label: "Question Paper" },
  VIDEOS: { bg: "bg-red-50", icon: Video, text: "text-red-500", label: "Video" },
  SYLLABUS: { bg: "bg-emerald-50", icon: BookOpen, text: "text-emerald-500", label: "Syllabus" },
  REFERENCE: { bg: "bg-amber-50", icon: BookOpen, text: "text-amber-500", label: "Reference" },
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [youtubeModal, setYoutubeModal] = useState<BookmarkedResource | null>(null)

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/user/bookmarks")
      const data = await res.json()
      if (Array.isArray(data.bookmarks)) {
        setBookmarks(data.bookmarks)
      }
    } catch (e) {
      console.error("Failed to fetch bookmarks:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const handleRemoveBookmark = async (resourceId: string) => {
    setRemovingIds((prev) => new Set(prev).add(resourceId))
    try {
      await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: "POST",
      })
      setBookmarks((prev) => prev.filter((b) => b.id !== resourceId))
    } catch {}
    setRemovingIds((prev) => {
      const next = new Set(prev)
      next.delete(resourceId)
      return next
    })
  }

  const handleDownload = async (resource: BookmarkedResource) => {
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
    return typeIcons[resourceType] || { bg: "bg-slate-50", icon: FileText, text: "text-slate-500", label: "Resource" }
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateStr)
  }

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesType = activeFilter === "all" || b.resourceType === activeFilter
    const matchesSearch =
      !searchQuery ||
      b.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.youtubeTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject?.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  // Group by type for stats
  const typeCounts = bookmarks.reduce((acc, b) => {
    acc[b.resourceType] = (acc[b.resourceType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5A623]/20 to-[#FCD34D]/20 shadow-sm">
            <Bookmark className="h-6 w-6 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
              Bookmarks
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              {bookmarks.length > 0
                ? `${bookmarks.length} saved resource${bookmarks.length !== 1 ? "s" : ""} across your subjects`
                : "Your saved resources and study materials"}
            </p>
          </div>
        </div>
        {bookmarks.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-full sm:w-72 rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 focus:border-[#F5A623] transition-all"
            />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {bookmarks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(typeIcons).map(([type, config]) => {
            const count = typeCounts[type] || 0
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(activeFilter === type ? "all" : type)}
                className={`relative rounded-xl p-3 border transition-all duration-200 text-left ${
                  activeFilter === type
                    ? "border-[#F5A623] bg-[#F5A623]/5 shadow-sm"
                    : "border-[#F1F5F9] bg-white hover:border-[#E2E8F0] hover:shadow-sm"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg} mb-1.5`}>
                  <config.icon className={`h-4 w-4 ${config.text}`} />
                </div>
                <div className="text-lg font-bold text-[#0F1117]">{count}</div>
                <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">
                  {config.label}{count !== 1 ? "s" : ""}
                </div>
                {activeFilter === type && (
                  <div className="absolute top-2 right-2">
                    <X className="h-3 w-3 text-[#F5A623]" />
                  </div>
                )}
              </button>
            )
          })}
          <button
            onClick={() => setActiveFilter("all")}
            className={`relative rounded-xl p-3 border transition-all duration-200 text-left ${
              activeFilter === "all"
                ? "border-[#F5A623] bg-[#F5A623]/5 shadow-sm"
                : "border-[#F1F5F9] bg-white hover:border-[#E2E8F0] hover:shadow-sm"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F5A623]/15 to-[#FCD34D]/15 mb-1.5">
              <BookmarkCheck className="h-4 w-4 text-[#F5A623]" />
            </div>
            <div className="text-lg font-bold text-[#0F1117]">{bookmarks.length}</div>
            <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">Total</div>
          </button>
        </div>
      )}

      {/* Filter Tabs (mobile friendly) */}
      {bookmarks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeFilter === tab.value
                  ? "bg-[#F5A623] text-white shadow-[0_2px_8px_rgba(245,166,35,0.3)]"
                  : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#F5A623]" />
          <p className="text-sm text-[#94A3B8]">Loading your bookmarks...</p>
        </div>
      ) : filteredBookmarks.length > 0 ? (
        <div className="space-y-3">
          {filteredBookmarks.map((resource) => {
            const typeConfig = getTypeConfig(resource.resourceType)
            const TypeIcon = typeConfig.icon
            const displayTitle =
              resource.mimeType === "youtube"
                ? resource.youtubeTitle || resource.originalFilename
                : resource.originalFilename
            const isRemoving = removingIds.has(resource.id)

            return (
              <div
                key={resource.id}
                className={`rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#E2E8F0] transition-all duration-200 group ${
                  isRemoving ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail / Icon */}
                  {resource.mimeType === "youtube" && resource.youtubeThumbnail ? (
                    <div
                      className="relative shrink-0 w-[120px] h-[68px] rounded-xl overflow-hidden bg-black cursor-pointer"
                      onClick={() => setYoutubeModal(resource)}
                    >
                      <img src={resource.youtubeThumbnail} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${typeConfig.bg}`}>
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
                      <h3 className="text-sm font-semibold text-[#0F1117] truncate">{displayTitle}</h3>
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
                    {/* Stats + Bookmark Date */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-[#F5A623] font-medium">
                        <Bookmark className="h-2.5 w-2.5 fill-[#F5A623]" /> Saved {formatTimeAgo(resource.bookmarkedAt)}
                      </span>
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
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {/* Remove Bookmark */}
                    <button
                      onClick={() => handleRemoveBookmark(resource.id)}
                      disabled={isRemoving}
                      className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                      title="Remove Bookmark"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>

                    {/* Download / Watch */}
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
      ) : bookmarks.length > 0 ? (
        /* Has bookmarks but filter doesn't match */
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center">
          <Filter className="h-12 w-12 text-[#E2E8F0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#334155]">No matching bookmarks</h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            Try a different filter or search term.
          </p>
          <button
            onClick={() => { setActiveFilter("all"); setSearchQuery("") }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F5A623] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#F5A623]/20 hover:bg-[#E09620] transition-all duration-200"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEF3C7] mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-[#F5A623]" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[#334155]">No bookmarks yet</h3>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-sm mx-auto">
            Save resources by clicking the bookmark icon on any study material. Your saved items will appear here.
          </p>
          <Link
            href="/dashboard/study-materials"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline"
          >
            <BookOpen className="h-4 w-4" />
            Browse Study Materials
          </Link>
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
              <h3 className="text-base font-bold text-[#0F1117] truncate">{youtubeModal.youtubeTitle}</h3>
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
