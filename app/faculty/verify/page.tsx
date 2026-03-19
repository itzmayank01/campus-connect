"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Download, Eye, FileText, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingResource {
  id: string
  originalFilename: string
  fileSize: number
  resourceType: string
  subjectName: string
  subjectCode: string
  semester: number
  createdAt: string
  uploaderName: string
  uploaderId: string
}

const rejectionReasons = [
  "Wrong subject or semester",
  "Poor quality content",
  "Duplicate resource exists",
  "Irrelevant to course",
  "Copyright issue",
  "Other",
]

export default function FacultyVerifyPage() {
  const [tab, setTab] = useState<"pending" | "verified" | "rejected">("pending")
  const [resources, setResources] = useState<PendingResource[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedReason, setSelectedReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const fetchResources = useCallback(() => {
    setLoading(true)
    fetch(`/api/faculty/verify/pending?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => setResources(Array.isArray(d.resources) ? d.resources : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { fetchResources() }, [fetchResources])

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleVerify = async (resourceId: string) => {
    setProcessingId(resourceId)
    try {
      const res = await fetch(`/api/faculty/verify/${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verified" }),
      })
      if (!res.ok) throw new Error()
      setResources((prev) => prev.filter((r) => r.id !== resourceId))
      showToast("✅ Verified! Now live for all students", "success")
    } catch {
      showToast("Failed to verify. Please try again.", "error")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (resourceId: string) => {
    if (!selectedReason) return
    setProcessingId(resourceId)
    try {
      const res = await fetch(`/api/faculty/verify/${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejected",
          reason: selectedReason,
          otherReason: selectedReason === "Other" ? otherReason : undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setResources((prev) => prev.filter((r) => r.id !== resourceId))
      setRejectingId(null)
      setSelectedReason("")
      setOtherReason("")
      showToast("Resource returned to student with feedback", "success")
    } catch {
      showToast("Failed to reject. Please try again.", "error")
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-3 shadow-xl text-sm font-medium text-white transition-all duration-300 ${
          toast.type === "success" ? "bg-[#22C55E]" : "bg-[#EF4444]"
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F1117]">Verify Student Uploads</h1>
        <p className="text-sm text-[#64748B] mt-1">Help students by reviewing their uploaded study materials</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["pending", "verified", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-150 ${
              tab === t
                ? t === "pending"
                  ? "bg-[#F97316] text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
                  : t === "verified"
                  ? "bg-[#22C55E] text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
                  : "bg-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]"
                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} {tab === t && !loading ? `(${resources.length})` : ""}
          </button>
        ))}
      </div>

      {/* Resources */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-sm">{tab === "pending" ? "All caught up! No pending uploads to review 🎉" : `No ${tab} uploads yet`}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300"
              style={{ opacity: processingId === r.id ? 0.5 : 1 }}
            >
              {/* Status label */}
              <div className="mb-4">
                <span className="rounded-md bg-[#FFF7ED] text-[#F97316] px-2 py-0.5 text-[10px] font-bold">
                  ⏳ PENDING VERIFICATION
                </span>
              </div>

              {/* File info */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9]">
                  <FileText className="h-6 w-6 text-[#6B7280]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0F1117]">{r.originalFilename}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[12px] text-[#64748B]">
                    <span>👤 {r.uploaderName}</span>
                    <span>📚 {r.subjectName}</span>
                    <span>🎓 Semester {r.semester} • {r.subjectCode} • {r.resourceType}</span>
                    <span>📅 {formatDate(r.createdAt)} • {formatSize(r.fileSize)}</span>
                  </div>
                </div>
              </div>

              {/* Preview / Download */}
              <div className="flex gap-2 mb-4">
                <a
                  href={`/api/resources/${r.id}/preview`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all no-underline"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </a>
                <a
                  href={`/api/resources/${r.id}/download`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#059669] bg-[#059669]/5 hover:bg-[#059669]/10 transition-all no-underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download to Review
                </a>
              </div>

              {/* Decision area */}
              {tab === "pending" && (
                <>
                  <div className="border-t border-[#F1F5F9] pt-4">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Your Decision</p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleVerify(r.id)}
                        disabled={processingId === r.id}
                        className="flex-1 h-11 rounded-xl bg-[#22C55E] text-white hover:bg-[#16A34A] font-semibold gap-2"
                      >
                        {processingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        VERIFY
                      </Button>
                      <Button
                        onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                        disabled={processingId === r.id}
                        variant="outline"
                        className="flex-1 h-11 rounded-xl border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] font-semibold gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        REJECT
                      </Button>
                    </div>
                  </div>

                  {/* Rejection reasons */}
                  <div
                    className="overflow-hidden transition-all duration-[250ms] ease-out"
                    style={{
                      maxHeight: rejectingId === r.id ? "400px" : "0px",
                      opacity: rejectingId === r.id ? 1 : 0,
                    }}
                  >
                    <div className="pt-4 space-y-2">
                      {rejectionReasons.map((reason) => (
                        <label
                          key={reason}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 border ${
                            selectedReason === reason
                              ? "border-[#EF4444] bg-[#FEF2F2]"
                              : "border-[#F1F5F9] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`reason-${r.id}`}
                            className="accent-[#EF4444]"
                            checked={selectedReason === reason}
                            onChange={() => setSelectedReason(reason)}
                          />
                          <span className="text-sm text-[#334155]">{reason}</span>
                        </label>
                      ))}
                      {selectedReason === "Other" && (
                        <input
                          type="text"
                          placeholder="Specify reason..."
                          className="w-full h-10 rounded-xl border border-[#E2E8F0] px-3 text-sm"
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                        />
                      )}
                      <Button
                        onClick={() => handleReject(r.id)}
                        disabled={!selectedReason || processingId === r.id}
                        className="w-full h-11 rounded-xl bg-[#EF4444] text-white hover:bg-[#DC2626] font-semibold mt-2"
                      >
                        {processingId === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
