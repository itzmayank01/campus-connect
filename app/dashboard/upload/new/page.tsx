"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Check, AlertCircle, Loader2, ArrowLeft, Play, Link2 } from "lucide-react"
import { ModerationProgress } from "@/components/dashboard/moderation-progress"

interface SubjectOption {
  id: string
  name: string
  code: string
  semesterNumber?: number
}

interface YoutubeMetadata {
  title: string
  thumbnail_url: string
  author_name: string
  type: "video" | "playlist"
  videoId?: string
  playlistId?: string
}

function extractYouTubeInfo(url: string): { type: "video" | "playlist"; videoId?: string; playlistId?: string } | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace("www.", "")

    if (parsed.searchParams.get("list")) {
      return {
        type: "playlist",
        playlistId: parsed.searchParams.get("list") || undefined,
        videoId: parsed.searchParams.get("v") || undefined,
      }
    }

    if ((hostname === "youtube.com" || hostname === "m.youtube.com") && parsed.searchParams.get("v")) {
      return { type: "video", videoId: parsed.searchParams.get("v") || undefined }
    }

    if (hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1)
      if (videoId) return { type: "video", videoId }
    }

    if (hostname === "youtube.com" && parsed.pathname.startsWith("/embed/")) {
      const videoId = parsed.pathname.split("/embed/")[1]
      if (videoId) return { type: "video", videoId }
    }

    return null
  } catch {
    return null
  }
}

export default function UploadNewPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [title, setTitle] = useState("")
  const [fileType, setFileType] = useState("notes")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [youtubeMetadata, setYoutubeMetadata] = useState<YoutubeMetadata | null>(null)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)

  // Moderation state
  const [moderationVisible, setModerationVisible] = useState(false)
  const [moderationSteps, setModerationSteps] = useState<Array<{id: string; label: string; status: "pending" | "running" | "done" | "failed"; message?: string}>>([])
  const [moderationPassed, setModerationPassed] = useState<boolean | null>(null)
  const [moderationReason, setModerationReason] = useState<string | undefined>()
  const [moderationTags, setModerationTags] = useState<string[] | undefined>()
  const [moderationDuplicates, setModerationDuplicates] = useState<any[] | undefined>()
  const [moderationRejection, setModerationRejection] = useState<any | undefined>()

  const filteredSubjects = selectedSemester 
    ? subjects.filter((s) => s.semesterNumber?.toString() === selectedSemester)
    : []
  
  const isVideoType = fileType === "videos"


  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubjects(data)
          if (data.length > 0) setSelectedSubject(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch YouTube metadata when URL changes
  useEffect(() => {
    if (!youtubeUrl || fileType !== "videos") return

    const ytInfo = extractYouTubeInfo(youtubeUrl)
    if (!ytInfo) {
      setYoutubeMetadata(null)
      return
    }

    const timer = setTimeout(async () => {
      setFetchingMetadata(true)
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
        )
        if (res.ok) {
          const data = await res.json()
          const metadata: YoutubeMetadata = {
            title: data.title || "",
            thumbnail_url: data.thumbnail_url || "",
            author_name: data.author_name || "",
            type: ytInfo.type,
            videoId: ytInfo.videoId,
            playlistId: ytInfo.playlistId,
          }
          setYoutubeMetadata(metadata)
          if (!title || title === youtubeMetadata?.title) {
            setTitle(data.title || "")
          }
        } else {
          setYoutubeMetadata(null)
        }
      } catch {
        setYoutubeMetadata(null)
      } finally {
        setFetchingMetadata(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [youtubeUrl, fileType])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }, [title])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleUpload = async () => {
    // YouTube upload
    if (fileType === "videos") {
      if (!youtubeUrl || !selectedSemester || !selectedSubject || !title) {
        setUploadStatus("error")
        setUploadMessage("Please fill all fields and paste a valid YouTube URL")
        return
      }

      const ytInfo = extractYouTubeInfo(youtubeUrl)
      if (!ytInfo) {
        setUploadStatus("error")
        setUploadMessage("Invalid YouTube URL")
        return
      }

      setUploading(true)
      setUploadStatus("idle")

      try {
        const res = await fetch("/api/resources/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: youtubeUrl,
            title,
            subjectId: selectedSubject,
            semester: Number(selectedSemester),
            type: fileType,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to save YouTube resource")
        }

        setUploadStatus("success")
        setUploadMessage(`"${title}" added successfully!`)
        setYoutubeUrl("")
        setYoutubeMetadata(null)
        setTitle("")

        setTimeout(() => router.push("/dashboard/upload"), 1500)
      } catch (error: unknown) {
        setUploadStatus("error")
        setUploadMessage(error instanceof Error ? error.message : "Failed to add YouTube resource")
      } finally {
        setUploading(false)
      }
      return
    }

    // File upload with moderation pipeline
    if (!selectedFile || !selectedSemester || !selectedSubject || !title) {
      setUploadStatus("error")
      setUploadMessage("Please fill all fields and select a file")
      return
    }

    setUploading(true)
    setUploadStatus("idle")

    // Show moderation progress UI
    const initialSteps = [
      { id: "file_type", label: "File type verification", status: "running" as const },
      { id: "upload_s3", label: "Uploading to secure storage", status: "pending" as const },
      { id: "relevance", label: "Checking content relevance", status: "pending" as const },
      { id: "safety", label: "Safety check", status: "pending" as const },
      { id: "duplicate", label: "Duplicate detection", status: "pending" as const },
      { id: "save", label: "Saving resource", status: "pending" as const },
    ]
    setModerationSteps(initialSteps)
    setModerationPassed(null)
    setModerationReason(undefined)
    setModerationTags(undefined)
    setModerationDuplicates(undefined)
    setModerationRejection(undefined)
    setModerationVisible(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("title", title)
      formData.append("subjectId", selectedSubject)
      formData.append("semester", selectedSemester)
      formData.append("type", fileType)

      const res = await fetch("/api/upload/moderate", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      // Update steps from response
      if (data.steps) {
        setModerationSteps(data.steps)
      }

      if (data.passed) {
        setModerationPassed(true)
        setModerationTags(data.tags)
        setModerationDuplicates(data.duplicates)
        setUploadStatus("success")
        setUploadMessage(`"${title}" uploaded successfully!`)
        setSelectedFile(null)
        setTitle("")
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else if (data.error) {
        throw new Error(data.details || data.error)
      } else {
        setModerationPassed(false)
        setModerationReason(data.reason)
        setModerationRejection(data.rejection)
        setUploadStatus("error")
        setUploadMessage(data.reason || "Upload was not approved")
      }
    } catch (error: unknown) {
      setModerationPassed(false)
      setModerationReason(error instanceof Error ? error.message : "Upload failed")
      setUploadStatus("error")
      setUploadMessage(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/upload")}
        className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F8EF7] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Your Uploads
      </button>

      {/* Page Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
          Upload Material
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Share study materials with your peers
        </p>
      </div>

      {/* Upload Form Card */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DSA Unit 3 Notes"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
            />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value)
                setSelectedSubject("")
                setFileType("notes")
              }}
              className={`w-full rounded-xl border ${!selectedSemester ? "border-red-500" : "border-[#E2E8F0]"} bg-white px-4 py-2.5 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all cursor-pointer`}
            >
              <option value="" disabled>Select your semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num.toString()}>Semester {num}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedSemester}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!selectedSemester ? (
                <option value="">Select semester first</option>
              ) : filteredSubjects.length === 0 ? (
                <option value="">No subjects found</option>
              ) : (
                <option value="" disabled>Select a subject</option>
              )}
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Type</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "notes", label: "Notes" },
                { value: "question_papers", label: "Question Paper" },
                { value: "videos", label: "Video" },
                { value: "reference", label: "Reference" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFileType(opt.value)
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                    fileType === opt.value
                      ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                      : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>



          {/* YouTube URL Input (shown when Video type) */}
          {isVideoType ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374155] mb-1.5">
                  🎬 YouTube URL
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube video or playlist URL..."
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
                  />
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-[#94A3B8]">
                  <span className="flex items-center gap-1">✓ youtube.com/watch?v=...</span>
                  <span className="flex items-center gap-1">✓ youtube.com/playlist?list=...</span>
                  <span className="flex items-center gap-1">✓ youtu.be/...</span>
                </div>
              </div>

              {/* YouTube Preview Card */}
              {fetchingMetadata && (
                <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#4F8EF7]" />
                  <span className="text-sm text-[#64748B]">Fetching video info...</span>
                </div>
              )}

              {youtubeMetadata && !fetchingMetadata && (
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex gap-4">
                  {youtubeMetadata.thumbnail_url && (
                    <div className="relative shrink-0 w-[120px] h-[68px] rounded-lg overflow-hidden bg-black">
                      <img
                        src={youtubeMetadata.thumbnail_url}
                        alt={youtubeMetadata.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#0F1117] truncate">
                      {youtubeMetadata.title}
                    </h4>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Channel: {youtubeMetadata.author_name}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Type: {youtubeMetadata.type === "playlist" ? "Playlist" : "Single Video"}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-md bg-[#ECFDF5] text-[#059669] px-2 py-0.5 text-[10px] font-medium">
                      <Check className="h-3 w-3" /> Valid YouTube URL
                    </span>
                  </div>
                </div>
              )}

              {youtubeUrl && !youtubeMetadata && !fetchingMetadata && extractYouTubeInfo(youtubeUrl) === null && (
                <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3">
                  <AlertCircle className="h-4 w-4 text-[#DC2626]" />
                  <span className="text-sm text-[#DC2626]">Invalid YouTube URL. Please check and try again.</span>
                </div>
              )}
            </div>
          ) : (
            /* File Drop Zone (for non-video types) */
            <div>
              <label className="block text-xs font-semibold text-[#374155] mb-1.5">File</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#4F8EF7] bg-[#4F8EF7]/5"
                    : selectedFile
                    ? "border-[#34D399] bg-[#34D399]/5"
                    : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#4F8EF7] hover:bg-[#4F8EF7]/[0.02]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={fileType === "question_papers" ? ".pdf,.zip" : ".pdf,.doc,.docx,.ppt,.pptx,.zip"}
                />
                {selectedFile ? (
                  <>
                    <FileText className="h-10 w-10 text-[#34D399]" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-[#0F1117]">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#64748B]">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-[#94A3B8]" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-[#64748B]">
                      Drop your file here or <span className="text-[#4F8EF7] font-semibold">browse</span>
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      {fileType === "question_papers" ? "PDF, ZIP" : "PDF, DOC, PPT, ZIP"} — up to 50 MB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status Message */}
          {uploadStatus !== "idle" && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
              uploadStatus === "success"
                ? "bg-[#ECFDF5] text-[#059669]"
                : "bg-[#FEF2F2] text-[#DC2626]"
            }`}>
              {uploadStatus === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {uploadMessage}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={
              uploading ||
              !title ||
              !selectedSubject ||
              !selectedSemester ||
              (isVideoType
                ? !youtubeUrl || !extractYouTubeInfo(youtubeUrl)
                : !selectedFile)
            }
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold py-3 px-6 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isVideoType ? "Adding YouTube Resource..." : "Uploading to S3..."}
              </>
            ) : (
              <>
                {isVideoType ? (
                  <>
                    <Play className="h-4 w-4" />
                    Add YouTube Resource
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload File
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Moderation Progress Overlay */}
      <ModerationProgress
        visible={moderationVisible}
        steps={moderationSteps}
        passed={moderationPassed}
        reason={moderationReason}
        tags={moderationTags}
        duplicates={moderationDuplicates}
        rejection={moderationRejection}
        onClose={() => {
          setModerationVisible(false)
          if (moderationPassed) {
            setTimeout(() => router.push("/dashboard/upload"), 500)
          }
        }}
        onUploadAnyway={() => {
          setModerationVisible(false)
          setModerationDuplicates(undefined)
        }}
        onChangeSubject={() => {
          setModerationVisible(false)
          setSelectedSubject("")
        }}
      />
    </div>
  )
}
