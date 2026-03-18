"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Download, Eye, Upload, Loader2, Plus, Calendar, BookOpen, Trash2, CheckSquare, Square, XCircle, RefreshCw, Play } from "lucide-react"

interface UploadedFile {
  id: string
  title: string
  type: string
  format: string
  fileUrl: string | null
  fileSize: string | null
  downloads: number
  createdAt: string
  subject: { name: string; code: string } | null
  mimeType?: string
}

const typeLabels: Record<string, string> = {
  notes: "Notes",
  question_papers: "Question Paper",
  videos: "Video",
  reference: "Reference",
}

const typeColors: Record<string, string> = {
  notes: "bg-[#EFF6FF] text-[#4F8EF7] border-[#BFDBFE]/50",
  question_papers: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]/50",
  videos: "bg-[#F0FDF4] text-[#059669] border-[#A7F3D0]/50",
  reference: "bg-[#F5F3FF] text-[#7C3AED] border-[#C4B5FD]/50",
}

const formatColors: Record<string, string> = {
  YT: "bg-red-50 text-red-600 border-red-200",
  PDF: "bg-red-50 text-red-600 border-red-100",
  DOC: "bg-blue-50 text-blue-600 border-blue-100",
  DOCX: "bg-blue-50 text-blue-600 border-blue-100",
  PPT: "bg-orange-50 text-orange-600 border-orange-100",
  PPTX: "bg-orange-50 text-orange-600 border-orange-100",
  MP4: "bg-purple-50 text-purple-600 border-purple-100",
  ZIP: "bg-gray-50 text-gray-600 border-gray-100",
}

export default function YourUploadsPage() {
  const router = useRouter()
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, "view" | "download" | "delete" | null>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; type: "single" | "bulk" } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUploads = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true)
    try {
      const r = await fetch("/api/upload")
      const data = await r.json()
      setUploads(Array.isArray(data) ? data : [])
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUploads(false)
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleView = async (noteId: string) => {
    setActionLoading((prev) => ({ ...prev, [noteId]: "view" }))
    try {
      const res = await fetch(`/api/upload/download?noteId=${noteId}`)
      if (!res.ok) throw new Error("Failed to get file URL")
      const { url } = await res.json()
      window.open(url, "_blank")
    } catch (err) {
      alert("Could not open file. Please try again.")
    } finally {
      setActionLoading((prev) => ({ ...prev, [noteId]: null }))
    }
  }

  const handleDownload = async (noteId: string, title: string) => {
    setActionLoading((prev) => ({ ...prev, [noteId]: "download" }))
    try {
      const res = await fetch(`/api/upload/download?noteId=${noteId}`)
      if (!res.ok) throw new Error("Failed to get file URL")
      const { url } = await res.json()

      const fileRes = await fetch(url)
      const blob = await fileRes.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = blobUrl
      a.download = title
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
        document.body.removeChild(a)
      }, 100)
    } catch (err) {
      alert("Could not download file. Please try again.")
    } finally {
      setActionLoading((prev) => ({ ...prev, [noteId]: null }))
    }
  }

  // ── Delete logic ──────────────────────────────────────────────
  const executeDelete = async (noteIds: string[]) => {
    if (noteIds.length === 1) {
      setActionLoading((prev) => ({ ...prev, [noteIds[0]]: "delete" }))
    } else {
      setBulkDeleting(true)
    }

    try {
      const res = await fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds }),
      })

      if (!res.ok) throw new Error("Delete failed")

      const data = await res.json()
      const deletedSet = new Set(data.deleted as string[])

      // Remove deleted files from state
      setUploads((prev) => prev.filter((f) => !deletedSet.has(f.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deletedSet.forEach((id) => next.delete(id))
        return next
      })
    } catch (err) {
      alert("Failed to delete files. Please try again.")
    } finally {
      if (noteIds.length === 1) {
        setActionLoading((prev) => ({ ...prev, [noteIds[0]]: null }))
      } else {
        setBulkDeleting(false)
      }
      setConfirmDelete(null)
    }
  }

  // ── Selection helpers ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(uploads.map((f) => f.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const allSelected = uploads.length > 0 && selectedIds.size === uploads.length

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            Your Uploads
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            {uploads.length} file{uploads.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUploads(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] font-medium px-4 py-2.5 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-200"
            title="Refresh uploads list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard/upload/new")}
            className="flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Upload New File
          </button>
        </div>
      </div>

      {/* ── Bulk Delete Toolbar ── */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-5 py-3 border transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #FEF2F2, #FFF1F2)",
            borderColor: "#FECACA",
          }}
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-[#4F8EF7]" />
            <span className="text-sm font-semibold text-[#1E293B]">
              {selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs font-medium text-[#4F8EF7] hover:underline"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={deselectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#64748B] bg-white/80 hover:bg-white border border-[#E2E8F0] transition-all duration-150"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={() => setConfirmDelete({ ids: Array.from(selectedIds), type: "bulk" })}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 shadow-sm transition-all duration-150"
            >
              {bulkDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="rounded-2xl bg-white shadow-2xl border border-[#F1F5F9] p-6 w-full max-w-sm mx-4"
            style={{ animation: "fade-up-in 200ms ease-out" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF2F2]">
                <Trash2 className="h-5 w-5 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F1117]">Delete {confirmDelete.ids.length === 1 ? "File" : "Files"}?</h3>
                <p className="text-xs text-[#64748B]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[#475569] mb-5">
              {confirmDelete.ids.length === 1
                ? "Are you sure you want to delete this file? It will be permanently removed from storage."
                : `Are you sure you want to delete ${confirmDelete.ids.length} files? They will be permanently removed from storage.`}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDelete(confirmDelete.ids)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F8EF7]" />
          </div>
        ) : uploads.length > 0 ? (
          <div className="divide-y divide-[#F1F5F9]">
            {uploads.map((file) => {
              const isSelected = selectedIds.has(file.id)
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-4 p-4 sm:p-5 transition-all duration-150 group ${
                    isSelected
                      ? "bg-[#EFF6FF] border-l-[3px] border-l-[#4F8EF7]"
                      : "hover:bg-[#F8FAFC] border-l-[3px] border-l-transparent"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(file.id)}
                    className="shrink-0 transition-all duration-150"
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-[#4F8EF7]" />
                    ) : (
                      <Square className="h-5 w-5 text-[#CBD5E1] group-hover:text-[#94A3B8]" />
                    )}
                  </button>

                  {/* File icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9] group-hover:bg-[#E8EBF3] transition-colors">
                    {file.mimeType === "youtube" ? (
                      <Play className="h-6 w-6 text-red-500 fill-red-500" strokeWidth={1.75} />
                    ) : (
                      <FileText className="h-6 w-6 text-[#6B7280]" strokeWidth={1.75} />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#0F1117] truncate">{file.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Format badge */}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${formatColors[file.format] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                        {file.format}
                      </span>
                      {/* Type badge */}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${typeColors[file.type] || typeColors.notes}`}>
                        {typeLabels[file.type] || file.type}
                      </span>
                      {/* Subject */}
                      {file.subject && (
                        <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                          <BookOpen className="h-3 w-3" />
                          {file.subject.code}
                        </span>
                      )}
                      {/* Date */}
                      <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                        <Calendar className="h-3 w-3" />
                        {formatDate(file.createdAt)} at {formatTime(file.createdAt)}
                      </span>
                      {/* Downloads */}
                      <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                        <Download className="h-3 w-3" />
                        {file.downloads} downloads
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {/* View */}
                    {file.fileUrl && (
                      <button
                        onClick={() => handleView(file.id)}
                        disabled={!!actionLoading[file.id]}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 disabled:opacity-50 transition-all duration-150"
                        title="View file"
                      >
                        {actionLoading[file.id] === "view" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">View</span>
                      </button>
                    )}
                    {/* Download */}
                    {file.fileUrl && file.mimeType !== "youtube" && (
                      <button
                        onClick={() => handleDownload(file.id, file.title)}
                        disabled={!!actionLoading[file.id]}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 disabled:opacity-50 transition-all duration-150"
                        title="Download file"
                      >
                        {actionLoading[file.id] === "download" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}
                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete({ ids: [file.id], type: "single" })}
                      disabled={!!actionLoading[file.id]}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#EF4444] bg-[#EF4444]/5 hover:bg-[#EF4444]/10 disabled:opacity-50 transition-all duration-150"
                      title="Delete file"
                    >
                      {actionLoading[file.id] === "delete" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F3F9] mb-4">
              <Upload className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#334155]">No uploads yet</h3>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-xs">
              Files you upload will appear here with options to view and download
            </p>
            <button
              onClick={() => router.push("/dashboard/upload/new")}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200"
            >
              <Upload className="h-4 w-4" />
              Upload Your First File
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
