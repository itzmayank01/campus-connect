"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText, Video, HelpCircle, BookOpen, Download, Eye, Heart,
  Star, ArrowLeft, Loader2, Upload, ExternalLink, Play, Archive, Clock,
} from "lucide-react"
import { AiSummaryPanel } from "@/components/dashboard/ai-summary-panel"
import { ExamPredictor } from "@/components/dashboard/exam-predictor"

interface ResourceData {
  id: string
  originalFilename: string
  fileSize: number
  mimeType: string
  resourceType: string
  downloadCount: number
  likeCount: number
  averageRating: number
  isVerified: boolean
  verificationCount?: number
  uploaderRole?: string
  createdAt: string
  s3Key?: string | null
  resourceUrl?: string | null
  resourceUrlType?: string | null
  youtubeVideoId?: string | null
  youtubePlaylistId?: string | null
  youtubeThumbnail?: string | null
  youtubeTitle?: string | null
  youtubeChannel?: string | null
  uploader?: { id: string; name: string | null; email: string; image?: string | null }
}

interface NoteData {
  id: string
  title: string
  type: string
  format: string
  fileUrl: string | null
  fileSize: string | null
  downloads: number
  createdAt: string
  uploadedBy?: { id: string; name: string | null; email: string; image?: string | null }
}

interface SubjectInfo {
  id: string
  name: string
  code: string
  credits: number
  semester?: { number: number }
}

const typeLabels: Record<string, string> = {
  NOTES: "Notes", notes: "Notes",
  QUESTION_PAPERS: "Question Papers", question_papers: "Question Papers",
  VIDEOS: "Videos", videos: "Videos",
  REFERENCE: "Reference", reference: "Reference",
  SYLLABUS: "Syllabus", syllabus: "Syllabus",
}

const tabs = [
  { label: "All", value: "all", icon: BookOpen },
  { label: "Syllabus", value: "syllabus", icon: FileText },
  { label: "Notes", value: "notes", icon: FileText },
  { label: "Question Papers", value: "question_papers", icon: HelpCircle },
  { label: "Videos", value: "videos", icon: Video },
  { label: "Reference", value: "reference", icon: BookOpen },
]

export default function SubjectDetailPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [resources, setResources] = useState<ResourceData[]>([])
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [youtubeModal, setYoutubeModal] = useState<ResourceData | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({})
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch(`/api/subjects/${resolvedParams.subjectId}/resources`)
      .then((r) => r.json())
      .then((data) => {
        if (data.subject) setSubject(data.subject)
        if (Array.isArray(data.resources)) {
          setResources(data.resources)
          // Fetch like/rate status for each resource
          data.resources.forEach((r: ResourceData) => {
            fetch(`/api/resources/${r.id}/like`).then(res => res.json()).then(d => {
              setLikedMap(prev => ({ ...prev, [r.id]: d.liked }))
            }).catch(() => {})
            fetch(`/api/resources/${r.id}/rate`).then(res => res.json()).then(d => {
              setRatingMap(prev => ({ ...prev, [r.id]: d.userRating }))
            }).catch(() => {})
          })
        }
        if (Array.isArray(data.notes)) setNotes(data.notes)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resolvedParams.subjectId])

  const handleLike = async (resourceId: string) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/like`, { method: "POST" })
      if (!res.ok) return
      const data = await res.json()
      setLikedMap(prev => ({ ...prev, [resourceId]: data.liked }))
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, likeCount: data.likeCount } : r))
    } catch {}
  }

  const handleRate = async (resourceId: string, rating: number) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      })
      if (!res.ok) return
      const data = await res.json()
      setRatingMap(prev => ({ ...prev, [resourceId]: data.userRating }))
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, averageRating: data.averageRating, ratingCount: data.ratingCount } : r))
    } catch {}
  }

  const handleDownload = async (resourceId: string) => {
    setDownloadingId(resourceId)
    try {
      const res = await fetch(`/api/resources/${resourceId}/download`)
      if (!res.ok) throw new Error("Download failed")
      const data = await res.json()
      if (data.type === "youtube") {
        window.open(data.redirectUrl, "_blank")
      } else {
        const a = document.createElement("a")
        a.href = data.downloadUrl
        a.download = ""
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch {
      alert("Download failed. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = async (resourceId: string) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/preview`)
      if (!res.ok) throw new Error("Preview failed")
      const data = await res.json()
      if (data.type === "youtube") {
        const resource = resources.find((r) => r.id === resourceId)
        if (resource) setYoutubeModal(resource)
      } else {
        window.open(data.previewUrl, "_blank")
      }
    } catch {
      alert("Preview not available.")
    }
  }

  // Filter resources by tab
  const getFilteredResources = () => {
    const typeMap: Record<string, string[]> = {
      syllabus: ["SYLLABUS"],
      notes: ["NOTES"],
      question_papers: ["QUESTION_PAPERS"],
      videos: ["VIDEOS"],
      reference: ["REFERENCE"],
    }

    if (activeTab === "all") return resources
    const types = typeMap[activeTab] || []
    return resources.filter((r) => types.includes(r.resourceType))
  }

  const getFilteredNotes = () => {
    if (activeTab === "all") return notes
    return notes.filter((n) => n.type === activeTab)
  }

  const filteredResources = getFilteredResources()
  const filteredNotes = getFilteredNotes()
  const totalCount = filteredResources.length + filteredNotes.length
  const allTotal = resources.length + notes.length

  // Tab counts
  const tabCounts: Record<string, number> = {
    all: allTotal,
    syllabus: resources.filter((r) => r.resourceType === "SYLLABUS").length + notes.filter((n) => n.type === "syllabus").length,
    notes: resources.filter((r) => r.resourceType === "NOTES").length + notes.filter((n) => n.type === "notes").length,
    question_papers: resources.filter((r) => r.resourceType === "QUESTION_PAPERS").length + notes.filter((n) => n.type === "question_papers").length,
    videos: resources.filter((r) => r.resourceType === "VIDEOS").length + notes.filter((n) => n.type === "videos").length,
    reference: resources.filter((r) => r.resourceType === "REFERENCE").length + notes.filter((n) => n.type === "reference").length,
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "FILE"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/subjects")}
        className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F8EF7] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Subjects
      </button>

      {/* Header */}
      {subject && (
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F8EF7]/20 to-[#60A5FA]/20">
              <BookOpen className="h-7 w-7 text-[#4F8EF7]" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <h1 className="text-[24px] font-bold tracking-tight text-[#0F1117] font-display">
                {subject.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="rounded-md bg-[#4F8EF7]/10 text-[#4F8EF7] px-2 py-0.5 text-xs font-bold">
                  {subject.code}
                </span>
                {subject.semester && (
                  <span className="rounded-md bg-[#F5A623]/10 text-[#D97706] px-2 py-0.5 text-xs font-bold">
                    Semester {subject.semester.number}
                  </span>
                )}
                {subject.credits > 0 && (
                  <span className="rounded-md bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 text-xs font-bold">
                    {subject.credits} credits
                  </span>
                )}
                <span className="rounded-md bg-[#ECFDF5] text-[#059669] px-2 py-0.5 text-xs font-bold">
                  {allTotal} resource{allTotal !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard/upload/new"
              className="flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline shrink-0"
            >
              <Upload className="h-4 w-4" />
              Upload Resource
            </Link>
          </div>
        </div>
      )}

      {/* Exam Question Predictor */}
      {subject && (
        <ExamPredictor subjectId={subject.id} subjectName={subject.name} />
      )}

      {/* Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.value
                ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#334155]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label} ({tabCounts[tab.value] || 0})
          </button>
        ))}
      </div>

      {/* Resources List */}
      <div className="space-y-3">
        {/* Resource entries from resources table */}
        {filteredResources.map((resource) => (
          <div
            key={resource.id}
            className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200 group"
          >
            {resource.mimeType === "youtube" ? (
              /* YouTube Resource Card */
              <div className="flex gap-4">
                {/* Thumbnail */}
                {resource.youtubeThumbnail && (
                  <div
                    className="relative shrink-0 w-[160px] h-[90px] rounded-xl overflow-hidden bg-black cursor-pointer group/thumb"
                    onClick={() => setYoutubeModal(resource)}
                  >
                    <img
                      src={resource.youtubeThumbnail}
                      alt={resource.youtubeTitle || "Video"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      ▶ YouTube
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#0F1117] truncate">
                    {resource.youtubeTitle || resource.originalFilename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-[#64748B]">
                      🎬 {resource.resourceUrlType === "youtube_playlist" ? "YouTube Playlist" : "YouTube Video"}
                    </span>
                    {resource.youtubeChannel && (
                      <span className="text-[11px] text-[#64748B]">• {resource.youtubeChannel}</span>
                    )}
                    <span className="text-[11px] text-[#94A3B8]">• Added by {resource.uploader?.name || resource.uploader?.email}</span>
                    <span className="text-[11px] text-[#94A3B8]">• {formatDate(resource.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {(() => {
                      const vc = resource.verificationCount || 0
                      if (vc >= 3) return (
                        <span className="rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          🏆 Verified by {vc} faculty
                        </span>
                      )
                      if (vc >= 1) return (
                        <span className="rounded-md bg-[#ECFDF5] border border-[#86EFAC] text-[#15803D] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          ✅ Verified by {vc} faculty
                        </span>
                      )
                      return (
                        <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          ⏳ Pending verification
                        </span>
                      )
                    })()}
                    {resource.uploaderRole === "faculty" ? (
                      <span className="rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-[#22C55E] px-2 py-0.5 text-[10px] font-medium">
                        👨‍🏫 Faculty Upload
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] px-2 py-0.5 text-[10px] font-medium">
                        👤 Student Upload
                      </span>
                    )}
                    <button
                      onClick={() => handleLike(resource.id)}
                      className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 transition-all duration-200 ${
                        likedMap[resource.id]
                          ? "text-rose-500 bg-rose-50 border border-rose-200"
                          : "text-[#94A3B8] hover:text-rose-500 hover:bg-rose-50 border border-transparent"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${likedMap[resource.id] ? "fill-rose-500" : ""}`} />
                      {resource.likeCount}
                    </button>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(resource.id, star)}
                          onMouseEnter={() => setHoverRating(prev => ({ ...prev, [resource.id]: star }))}
                          onMouseLeave={() => setHoverRating(prev => ({ ...prev, [resource.id]: 0 }))}
                          className="p-0 border-none bg-transparent cursor-pointer transition-transform hover:scale-125"
                        >
                          <Star className={`h-3.5 w-3.5 transition-colors ${
                            star <= (hoverRating[resource.id] || ratingMap[resource.id] || 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300 hover:text-amber-300"
                          }`} />
                        </button>
                      ))}
                      {resource.averageRating > 0 && (
                        <span className="text-[10px] text-amber-600 ml-1 font-medium">{resource.averageRating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setYoutubeModal(resource)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-150"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Watch on Website
                    </button>
                    <a
                      href={resource.resourceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all duration-150 no-underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in YouTube
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* File Resource Card */
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9] group-hover:bg-[#E8EBF3] transition-colors">
                  {getFileExtension(resource.originalFilename) === "ZIP" ? (
                    <Archive className="h-6 w-6 text-[#6B7280]" strokeWidth={1.75} />
                  ) : (
                    <FileText className="h-6 w-6 text-[#6B7280]" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#0F1117] truncate">{resource.originalFilename}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="rounded-md bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 text-[10px] font-bold">
                      {getFileExtension(resource.originalFilename)}
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">• {formatFileSize(resource.fileSize)}</span>
                    <span className="text-[11px] text-[#94A3B8]">• Uploaded by {resource.uploader?.name || resource.uploader?.email}</span>
                    <span className="text-[11px] text-[#94A3B8]">• {formatDate(resource.createdAt)}</span>
                    <span className="rounded-md bg-[#EFF6FF] text-[#4F8EF7] border border-[#BFDBFE]/50 px-1.5 py-0.5 text-[10px] font-bold">
                      {typeLabels[resource.resourceType] || resource.resourceType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {(() => {
                      const vc = resource.verificationCount || 0
                      if (vc >= 3) return (
                        <span className="rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          🏆 Verified by {vc} faculty
                        </span>
                      )
                      if (vc >= 1) return (
                        <span className="rounded-md bg-[#ECFDF5] border border-[#86EFAC] text-[#15803D] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          ✅ Verified by {vc} faculty
                        </span>
                      )
                      return (
                        <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                          ⏳ Pending verification
                        </span>
                      )
                    })()}
                    {resource.uploaderRole === "faculty" ? (
                      <span className="rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-[#22C55E] px-2 py-0.5 text-[10px] font-medium">
                        👨‍🏫 Faculty Upload
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] px-2 py-0.5 text-[10px] font-medium">
                        👤 Student Upload
                      </span>
                    )}
                    <button
                      onClick={() => handleLike(resource.id)}
                      className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 transition-all duration-200 ${
                        likedMap[resource.id]
                          ? "text-rose-500 bg-rose-50 border border-rose-200"
                          : "text-[#94A3B8] hover:text-rose-500 hover:bg-rose-50 border border-transparent"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${likedMap[resource.id] ? "fill-rose-500" : ""}`} />
                      {resource.likeCount}
                    </button>
                    <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                      <Download className="h-3 w-3" /> {resource.downloadCount}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(resource.id, star)}
                          onMouseEnter={() => setHoverRating(prev => ({ ...prev, [resource.id]: star }))}
                          onMouseLeave={() => setHoverRating(prev => ({ ...prev, [resource.id]: 0 }))}
                          className="p-0 border-none bg-transparent cursor-pointer transition-transform hover:scale-125"
                        >
                          <Star className={`h-3.5 w-3.5 transition-colors ${
                            star <= (hoverRating[resource.id] || ratingMap[resource.id] || 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300 hover:text-amber-300"
                          }`} />
                        </button>
                      ))}
                      {resource.averageRating > 0 && (
                        <span className="text-[10px] text-amber-600 ml-1 font-medium">{resource.averageRating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  {(resource.mimeType?.includes("pdf") || resource.mimeType?.includes("zip") || resource.originalFilename?.toLowerCase().endsWith(".zip") || resource.originalFilename?.toLowerCase().endsWith(".pdf")) && (
                    <AiSummaryPanel resourceId={resource.id} />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  {resource.mimeType?.includes("pdf") && (
                    <button
                      onClick={() => handlePreview(resource.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all duration-150"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(resource.id)}
                    disabled={downloadingId === resource.id}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 disabled:opacity-50 transition-all duration-150"
                  >
                    {downloadingId === resource.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Legacy notes */}
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9]">
                <FileText className="h-6 w-6 text-[#6B7280]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#0F1117] truncate">{note.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="rounded-md bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 text-[10px] font-bold">
                    {note.format}
                  </span>
                  {note.fileSize && (
                    <span className="text-[11px] text-[#94A3B8]">• {note.fileSize}</span>
                  )}
                  <span className="text-[11px] text-[#94A3B8]">• Uploaded by {note.uploadedBy?.name || note.uploadedBy?.email || "Unknown"}</span>
                  <span className="text-[11px] text-[#94A3B8]">• {formatDate(note.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F3F9] mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#334155]">No resources yet</h3>
            <p className="text-sm text-[#94A3B8] mt-1">
              Be the first to upload {activeTab === "all" ? "resources" : typeLabels[activeTab]?.toLowerCase() || "materials"} for {subject?.code || "this subject"}!
            </p>
            <Link
              href="/dashboard/upload/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline"
            >
              <Upload className="h-4 w-4" />
              Upload Resource
            </Link>
          </div>
        )}
      </div>

      {/* YouTube Embed Modal */}
      {youtubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setYoutubeModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#F1F5F9] w-full max-w-3xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fade-up-in 200ms ease-out" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#0F1117] truncate">
                {youtubeModal.youtubeTitle || youtubeModal.originalFilename}
              </h3>
              <button
                onClick={() => setYoutubeModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#0F1117] hover:bg-[#F1F5F9] transition-all"
              >
                ✕
              </button>
            </div>
            {/* Video Player */}
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
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#F1F5F9]">
              <div>
                {youtubeModal.youtubeChannel && (
                  <p className="text-sm text-[#64748B]">Channel: {youtubeModal.youtubeChannel}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={youtubeModal.resourceUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all no-underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in YouTube
                </a>
                <button
                  onClick={() => setYoutubeModal(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
