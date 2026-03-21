"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Circle, AlertTriangle, Tag, ExternalLink } from "lucide-react"

interface ModerationStep {
  id: string
  label: string
  status: "pending" | "running" | "done" | "failed"
  message?: string
}

interface Duplicate {
  id: string
  filename: string
  uploaderName: string
  downloadCount: number
  averageRating: number
}

interface Rejection {
  subjectName: string
  subjectCode: string
  detectedTopics: string[]
  reason: string
}

interface ModerationProgressProps {
  visible: boolean
  steps: ModerationStep[]
  passed: boolean | null
  reason?: string
  tags?: string[]
  duplicates?: Duplicate[]
  rejection?: Rejection
  onClose: () => void
  onUploadAnyway?: () => void
  onChangeSubject?: () => void
}

function StepIcon({ status }: { status: ModerationStep["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4.5 w-4.5 text-[#059669]" />
    case "failed":
      return <XCircle className="h-4.5 w-4.5 text-[#EF4444]" />
    case "running":
      return <Loader2 className="h-4.5 w-4.5 text-[#4F8EF7] animate-spin" />
    default:
      return <Circle className="h-4.5 w-4.5 text-[#CBD5E1]" />
  }
}

export function ModerationProgress({
  visible,
  steps,
  passed,
  reason,
  tags,
  duplicates,
  rejection,
  onClose,
  onUploadAnyway,
  onChangeSubject,
}: ModerationProgressProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-2xl bg-white shadow-2xl border border-[#F1F5F9] w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-bold text-[#0F1117]">
            {passed === null
              ? "Uploading your resource..."
              : passed
              ? "✅ Upload Successful"
              : "Upload Issue"}
          </h3>
          {passed === null && (
            <p className="text-sm text-[#64748B] mt-1">
              AI is checking your content for quality and safety
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="px-6 space-y-3">
          <AnimatePresence>
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5">
                  <StepIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      step.status === "running"
                        ? "text-[#4F8EF7]"
                        : step.status === "failed"
                        ? "text-[#EF4444]"
                        : step.status === "done"
                        ? "text-[#0F1117]"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.message && (
                    <p className="text-[11px] text-[#64748B] mt-0.5">{step.message}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Rejection Card */}
        {rejection && (
          <div className="mx-6 mt-4 rounded-xl p-4" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
            <h4 className="text-sm font-bold text-[#991B1B] mb-2">❌ Upload Rejected</h4>
            <p className="text-sm text-[#7F1D1D] mb-2">
              This file doesn&apos;t appear to match the selected subject.
            </p>
            <div className="text-xs text-[#7F1D1D] space-y-1">
              <p><strong>Subject:</strong> {rejection.subjectName} ({rejection.subjectCode})</p>
              {rejection.detectedTopics.length > 0 && (
                <p><strong>Detected content:</strong> {rejection.detectedTopics.join(", ")}</p>
              )}
              <p><strong>Reason:</strong> {rejection.reason}</p>
            </div>
            <p className="text-xs text-[#7F1D1D] mt-2">Please check:</p>
            <ul className="text-xs text-[#7F1D1D] list-disc pl-4 mt-1 space-y-0.5">
              <li>Did you select the correct subject?</li>
              <li>Is this related to the course?</li>
            </ul>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicates && duplicates.length > 0 && (
          <div className="mx-6 mt-4 rounded-xl p-4" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <h4 className="text-sm font-bold text-[#92400E] mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Similar Resource Exists
            </h4>
            {duplicates.map((dup) => (
              <div key={dup.id} className="text-xs text-[#78350F] mb-1">
                <p className="font-medium">&quot;{dup.filename}&quot; by {dup.uploaderName}</p>
                <p>↓ {dup.downloadCount} downloads • ⭐ {dup.averageRating.toFixed(1)}</p>
              </div>
            ))}
            <p className="text-xs text-[#92400E] mt-2">Is your file significantly different?</p>
          </div>
        )}

        {/* AI Tags */}
        {tags && tags.length > 0 && passed && (
          <div className="mx-6 mt-4 flex items-center gap-2 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-[#4F8EF7]" />
            <span className="text-xs font-medium text-[#475569]">🤖 AI tags:</span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#4F8EF7]/10 text-[#4F8EF7] px-2 py-0.5 text-[10px] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Failure reason */}
        {!passed && passed !== null && reason && !rejection && (
          <div className="mx-6 mt-4 rounded-xl p-3" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm text-[#991B1B] font-medium">{reason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 mt-2 flex items-center gap-3 justify-end border-t border-[#F1F5F9]">
          {rejection && (
            <>
              <button
                onClick={onChangeSubject}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#4F8EF7] bg-[#4F8EF7]/5 hover:bg-[#4F8EF7]/10 transition-all"
              >
                Change Subject
              </button>
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-all"
              >
                Try Different File
              </button>
            </>
          )}
          {duplicates && duplicates.length > 0 && passed && (
            <button
              onClick={onUploadAnyway}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white bg-[#4F8EF7] hover:bg-[#3B7AE0] transition-all"
            >
              Upload Anyway
            </button>
          )}
          {(passed || (passed === false && !rejection)) && (
            <button
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                passed
                  ? "text-white bg-[#059669] hover:bg-[#047857]"
                  : "text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0]"
              }`}
            >
              {passed ? "Done" : "Close"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
