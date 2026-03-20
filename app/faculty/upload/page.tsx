"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload, FileText, Check, AlertCircle, Loader2, ArrowLeft, Play, Link2,
  X, FolderPlus, Eye, EyeOff, Tag
} from "lucide-react"

interface SubjectOption { id: string; name: string; code: string; semesterNumber?: number }
interface YoutubeMetadata {
  title: string; thumbnail_url: string; author_name: string
  type: "video" | "playlist"; videoId?: string; playlistId?: string
}

function extractYouTubeInfo(url: string): { type: "video" | "playlist"; videoId?: string; playlistId?: string } | null {
  try {
    const p = new URL(url), h = p.hostname.replace("www.", "")
    if (p.searchParams.get("list")) return { type: "playlist", playlistId: p.searchParams.get("list") || undefined, videoId: p.searchParams.get("v") || undefined }
    if ((h === "youtube.com" || h === "m.youtube.com") && p.searchParams.get("v")) return { type: "video", videoId: p.searchParams.get("v") || undefined }
    if (h === "youtu.be") { const v = p.pathname.slice(1); if (v) return { type: "video", videoId: v } }
    if (h === "youtube.com" && p.pathname.startsWith("/embed/")) { const v = p.pathname.split("/embed/")[1]; if (v) return { type: "video", videoId: v } }
    return null
  } catch { return null }
}

const resourceTypes = [
  { value: "notes", label: "📝 Notes" },
  { value: "question_papers", label: "❓ Question Paper" },
  { value: "videos", label: "🎬 Video" },
  { value: "reference", label: "📚 Reference" },
  { value: "lab_manual", label: "🔬 Lab Manual" },
]

export default function FacultyUploadPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [title, setTitle] = useState("")
  const [fileType, setFileType] = useState("notes")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [visibility, setVisibility] = useState<"public" | "draft">("public")
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [youtubeMetadata, setYoutubeMetadata] = useState<YoutubeMetadata | null>(null)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [folderName, setFolderName] = useState("")

  const filteredSubjects = selectedSemester ? subjects.filter((s) => s.semesterNumber?.toString() === selectedSemester) : []
  const isVideoType = fileType === "videos"

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setSubjects(data)
    }).catch(() => {})
  }, [])

  // YouTube metadata fetch
  useEffect(() => {
    if (!youtubeUrl || fileType !== "videos") return
    const info = extractYouTubeInfo(youtubeUrl)
    if (!info) { setYoutubeMetadata(null); return }
    const timer = setTimeout(async () => {
      setFetchingMetadata(true)
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`)
        if (res.ok) {
          const d = await res.json()
          setYoutubeMetadata({ title: d.title || "", thumbnail_url: d.thumbnail_url || "", author_name: d.author_name || "", type: info.type, videoId: info.videoId, playlistId: info.playlistId })
          if (!title) setTitle(d.title || "")
        } else setYoutubeMetadata(null)
      } catch { setYoutubeMetadata(null) }
      finally { setFetchingMetadata(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [youtubeUrl, fileType])

  // Auto folder name
  useEffect(() => {
    if (selectedFiles.length >= 3) {
      const subj = filteredSubjects.find((s) => s.id === selectedSubject)
      const typeLabel = resourceTypes.find((t) => t.value === fileType)?.label.replace(/[^\w\s]/g, "").trim() || "Notes"
      const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      setFolderName(`${subj?.name || "Subject"} - ${typeLabel} - ${month}`)
    }
  }, [selectedFiles.length, selectedSubject, fileType, filteredSubjects])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles((prev) => [...prev, ...files])
    if (!title && files[0]) setTitle(files[0].name.replace(/\.[^/.]+$/, ""))
  }, [title])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
    if (!title && files[0]) setTitle(files[0].name.replace(/\.[^/.]+$/, ""))
  }

  const removeFile = (idx: number) => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleUpload = async () => {
    if (isVideoType) {
      if (!youtubeUrl || !selectedSemester || !selectedSubject || !title) {
        setUploadStatus("error"); setUploadMessage("Please fill all required fields"); return
      }
      if (!extractYouTubeInfo(youtubeUrl)) {
        setUploadStatus("error"); setUploadMessage("Invalid YouTube URL"); return
      }
      setUploading(true); setUploadStatus("idle")
      try {
        const res = await fetch("/api/resources/youtube", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl, title, subjectId: selectedSubject, semester: Number(selectedSemester), type: fileType }),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed") }
        setUploadStatus("success"); setUploadMessage(`"${title}" added successfully!`)
        setYoutubeUrl(""); setYoutubeMetadata(null); setTitle("")
      } catch (e: unknown) {
        setUploadStatus("error"); setUploadMessage(e instanceof Error ? e.message : "Failed")
      } finally { setUploading(false) }
      return
    }

    if (selectedFiles.length === 0 || !selectedSemester || !selectedSubject || !title) {
      setUploadStatus("error"); setUploadMessage("Please fill all required fields and select files"); return
    }

    // Check file sizes (100MB limit for faculty)
    const oversized = selectedFiles.find((f) => f.size > 100 * 1024 * 1024)
    if (oversized) {
      setUploadStatus("error"); setUploadMessage(`"${oversized.name}" exceeds the 100 MB limit`); return
    }

    setUploading(true); setUploadStatus("idle"); setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setUploadProgress(Math.round(((i) / selectedFiles.length) * 100))
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", selectedFiles.length === 1 ? title : file.name.replace(/\.[^/.]+$/, ""))
        formData.append("subjectId", selectedSubject)
        formData.append("semester", selectedSemester)
        formData.append("type", fileType === "lab_manual" ? "reference" : fileType)
        if (description) formData.append("description", description)

        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) { const e = await res.json(); throw new Error(e.details || e.error || "Upload failed") }
      }
      setUploadProgress(100)
      setUploadStatus("success")
      setUploadMessage(`${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} uploaded successfully! Students can now access your materials.`)
      setSelectedFiles([]); setTitle(""); setDescription(""); setTags([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e: unknown) {
      setUploadStatus("error"); setUploadMessage(e instanceof Error ? e.message : "Upload failed")
    } finally { setUploading(false) }
  }

  const canSubmit = title && selectedSubject && selectedSemester && (isVideoType ? youtubeUrl && extractYouTubeInfo(youtubeUrl) : selectedFiles.length > 0)
  const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0)

  return (
    <div className="max-w-[720px] mx-auto space-y-6 pb-12">
      {/* Back link */}
      <button onClick={() => router.push("/faculty/uploads")}
        className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#22C55E] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to My Uploads
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117]">Upload Study Material</h1>
          <p className="text-sm text-[#64748B] mt-1">Share course materials with students</p>
        </div>
        <span className="rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] px-3 py-1 text-xs font-bold">Faculty Upload</span>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-8 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DBMS Unit 2 - ER Diagrams"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all" />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Semester *</label>
            <select value={selectedSemester}
              onChange={(e) => { setSelectedSemester(e.target.value); setSelectedSubject("") }}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all cursor-pointer">
              <option value="" disabled>Select semester</option>
              {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n.toString()}>Semester {n}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Subject *</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedSemester}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {!selectedSemester ? <option value="">Select semester first</option>
                : filteredSubjects.length === 0 ? <option value="">No subjects found</option>
                : <option value="" disabled>Select a subject</option>}
              {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>

          {/* Resource Type Pills */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Resource Type *</label>
            <div className="flex gap-2 flex-wrap">
              {resourceTypes.map((t) => (
                <button key={t.value} onClick={() => setFileType(t.value)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 ${
                    fileType === t.value
                      ? "bg-[#22C55E] text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
                      : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* YouTube URL (Video type) */}
          {isVideoType ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374155] mb-1.5">YouTube URL *</label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                  <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all" />
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[#94A3B8]">
                  <span>✓ Single video</span><span>✓ Full playlist</span><span>✓ youtu.be short links</span>
                </div>
              </div>
              {fetchingMetadata && (
                <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#22C55E]" /><span className="text-sm text-[#64748B]">Fetching video info...</span>
                </div>
              )}
              {youtubeMetadata && !fetchingMetadata && (
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex gap-4">
                  {youtubeMetadata.thumbnail_url && (
                    <div className="relative shrink-0 w-[120px] h-[68px] rounded-lg overflow-hidden bg-black">
                      <img src={youtubeMetadata.thumbnail_url} alt={youtubeMetadata.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center"><Play className="h-3.5 w-3.5 text-white fill-white" /></div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#0F1117] truncate">{youtubeMetadata.title}</h4>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{youtubeMetadata.author_name}</p>
                    <p className="text-[11px] text-[#64748B]">{youtubeMetadata.type === "playlist" ? "📋 Playlist" : "📹 Video"}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-md bg-[#ECFDF5] text-[#059669] px-2 py-0.5 text-[10px] font-medium"><Check className="h-3 w-3" /> Valid URL</span>
                  </div>
                </div>
              )}
              {youtubeUrl && !youtubeMetadata && !fetchingMetadata && !extractYouTubeInfo(youtubeUrl) && (
                <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3">
                  <AlertCircle className="h-4 w-4 text-[#DC2626]" /><span className="text-sm text-[#DC2626]">Invalid YouTube URL</span>
                </div>
              )}
            </div>
          ) : (
            /* File Drop Zone (multi-file) */
            <div>
              <label className="block text-xs font-semibold text-[#374155] mb-1.5">File{selectedFiles.length > 1 ? "s" : ""} *</label>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-[#22C55E] bg-[#ECFDF5] scale-[1.01]"
                    : "border-[#86EFAC] hover:border-[#22C55E] hover:bg-[#F0FDF4]/50"
                }`}
                style={{ minHeight: 160, background: isDragging ? undefined : "linear-gradient(135deg, #F0FDF4, #F8FAFC)" }}>
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.xlsx,.xls,.csv" />
                <Upload className="h-8 w-8 text-[#22C55E]" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-[#1E293B]">Drop files here or <span className="text-[#22C55E]">click to browse</span></p>
                <p className="text-[11px] text-[#94A3B8]">PDF, DOC, PPT, ZIP — up to 100 MB per file</p>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5">
                      <FileText className="h-4 w-4 text-[#6B7280] shrink-0" />
                      <span className="text-sm text-[#0F1117] font-medium truncate flex-1">{f.name}</span>
                      <span className="text-[11px] text-[#94A3B8] shrink-0">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="text-[#94A3B8] hover:text-[#EF4444] transition-colors shrink-0"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#94A3B8]">{selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} • {(totalSize / (1024 * 1024)).toFixed(1)} MB total</p>
                </div>
              )}

              {/* Folder auto-creation banner (3+ files) */}
              {selectedFiles.length >= 3 && (
                <div className="mt-3 rounded-xl bg-[#FFF7ED] border border-[#FDE68A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderPlus className="h-4 w-4 text-[#F97316]" />
                    <span className="text-xs font-semibold text-[#92400E]">📁 These {selectedFiles.length} files will be grouped into a folder</span>
                  </div>
                  <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)}
                    className="w-full rounded-lg border border-[#FDE68A] bg-white px-3 py-2 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30" />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this material, which units it covers, exam relevance..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1117] resize-y placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all"
              style={{ minHeight: 80 }} />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Tags (optional)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-[#F0FDF4] border border-[#86EFAC] text-[#15803D] px-2.5 py-0.5 text-[11px] font-medium">
                  <Tag className="h-3 w-3" />{t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-[#EF4444]"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
              placeholder="Type tag and press Enter..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 focus:border-[#22C55E] transition-all" />
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#374155] mb-1.5">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setVisibility("public")}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all border ${
                  visibility === "public"
                    ? "border-[#22C55E] bg-[#F0FDF4] text-[#15803D] shadow-[0_0_0_3px_rgba(34,197,94,0.1)]"
                    : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}>
                <Eye className="h-4 w-4" /> 🌍 Public — Visible to all
              </button>
              <button onClick={() => setVisibility("draft")}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all border ${
                  visibility === "draft"
                    ? "border-[#64748B] bg-[#F1F5F9] text-[#334155] shadow-[0_0_0_3px_rgba(100,116,139,0.1)]"
                    : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}>
                <EyeOff className="h-4 w-4" /> 📁 Draft — Save privately
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {uploadStatus !== "idle" && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
              uploadStatus === "success" ? "bg-[#ECFDF5] text-[#059669] border border-[#86EFAC]" : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
            }`}>
              {uploadStatus === "success" ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>
                <p>{uploadMessage}</p>
                {uploadStatus === "success" && (
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => { setUploadStatus("idle"); setUploadMessage("") }}
                      className="rounded-lg bg-white border border-[#86EFAC] text-[#15803D] px-4 py-2 text-xs font-semibold hover:bg-[#F0FDF4] transition-all">
                      Upload More
                    </button>
                    <button onClick={() => router.push("/faculty/uploads")}
                      className="rounded-lg bg-[#22C55E] text-white px-4 py-2 text-xs font-semibold hover:bg-[#16A34A] transition-all">
                      View My Uploads →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && selectedFiles.length > 1 && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1.5">
                <span>Uploading {Math.min(Math.round((uploadProgress / 100) * selectedFiles.length) + 1, selectedFiles.length)} of {selectedFiles.length} files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#86EFAC] transition-all duration-300 animate-pulse"
                  style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button onClick={handleUpload} disabled={uploading || !canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] text-white font-semibold py-3.5 px-6 shadow-lg shadow-[#22C55E]/20 hover:bg-[#16A34A] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-base"
            style={{ height: 52 }}>
            {uploading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</>
            ) : isVideoType ? (
              <><Play className="h-5 w-5" /> Add Video Resource</>
            ) : (
              <><Upload className="h-5 w-5" /> {selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Files` : selectedFiles.length === 1 ? "Upload 1 File" : "Upload Material"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
