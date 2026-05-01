"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Circle, AlertTriangle, Tag, Shield, ShieldAlert, ShieldX } from "lucide-react"

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

// Detect the type of STOP message to show
function getStopType(reason?: string): "adult" | "harmful" | "irrelevant" | "generic" {
  if (!reason) return "generic"
  const lower = reason.toLowerCase()
  if (lower.includes("adult") || lower.includes("nsfw") || lower.includes("explicit") || lower.includes("sexual")) return "adult"
  if (lower.includes("illegal") || lower.includes("violence") || lower.includes("hate") || lower.includes("drug") || lower.includes("harm") || lower.includes("blocked & reported") || lower.includes("incident")) return "harmful"
  if (lower.includes("irrelevant") || lower.includes("not match") || lower.includes("not relevant") || lower.includes("mismatch")) return "irrelevant"
  return "generic"
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

  const stopType = getStopType(reason)
  const hasFailed = passed === false && passed !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-2xl bg-white shadow-2xl border border-[#F1F5F9] w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            {passed === null ? (
              <Shield className="h-5 w-5 text-[#4F8EF7]" />
            ) : passed ? (
              <CheckCircle2 className="h-5 w-5 text-[#059669]" />
            ) : (
              <ShieldX className="h-5 w-5 text-[#EF4444]" />
            )}
            <h3 className="text-base font-bold text-[#0F1117]">
              {passed === null
                ? "Anti-Gravity Inspection..."
                : passed
                ? "✅ Upload Approved"
                : "⛔ Upload Rejected"}
            </h3>
          </div>
          {passed === null && (
            <p className="text-sm text-[#64748B] mt-1 ml-[30px]">
              AI is scanning your content for safety and relevance
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

        {/* ═══ STOP MESSAGE: Adult / Explicit Content ═══ */}
        {hasFailed && stopType === "adult" && !rejection && (
          <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-[#FCA5A5]">
            <div className="bg-[#DC2626] px-4 py-2.5 flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">⛔ STOP — UPLOAD REJECTED</span>
            </div>
            <div className="bg-[#FEF2F2] px-4 py-3 space-y-2">
              <p className="text-sm text-[#7F1D1D]">
                Adult-rated or explicit content was detected in your file. This content is <strong>not permitted</strong> on this platform.
              </p>
              <p className="text-xs text-[#991B1B] font-medium">
                This file has been permanently rejected. Do not attempt to re-upload this content.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STOP MESSAGE: Harmful / Illegal Content ═══ */}
        {hasFailed && stopType === "harmful" && !rejection && (
          <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-[#FCA5A5]">
            <div className="bg-[#991B1B] px-4 py-2.5 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">⛔ STOP — UPLOAD BLOCKED &amp; REPORTED</span>
            </div>
            <div className="bg-[#FEF2F2] px-4 py-3 space-y-2">
              <p className="text-sm text-[#7F1D1D]">
                This file contains content that violates legal and platform safety policies.
              </p>
              <p className="text-xs text-[#991B1B] font-medium">
                This incident has been logged automatically. Continued violations may result in account suspension.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STOP MESSAGE: Irrelevant Content (without subject rejection) ═══ */}
        {hasFailed && stopType === "irrelevant" && !rejection && (
          <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-[#FDE68A]">
            <div className="bg-[#D97706] px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">⛔ STOP — UPLOAD REJECTED</span>
            </div>
            <div className="bg-[#FFFBEB] px-4 py-3 space-y-2">
              <p className="text-sm text-[#78350F]">
                The content in this file does not match the accepted topics for this platform.
              </p>
              <p className="text-xs text-[#92400E]">
                Please upload only relevant academic materials.
              </p>
            </div>
          </div>
        )}

        {/* ═══ Rejection Card (subject mismatch — detailed) ═══ */}
        {rejection && (
          <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-[#FCA5A5]">
            <div className="bg-[#DC2626] px-4 py-2.5 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">⛔ UPLOAD REJECTED — Content Mismatch</span>
            </div>
            <div className="bg-[#FEF2F2] px-4 py-3 space-y-2">
              <p className="text-sm text-[#7F1D1D]">
                This file doesn&apos;t match the selected subject.
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
          </div>
        )}

        {/* ═══ Generic failure reason (safety service down, parse error, etc.) ═══ */}
        {hasFailed && stopType === "generic" && !rejection && (
          <div className="mx-6 mt-4 rounded-xl p-4" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldX className="h-4 w-4 text-[#DC2626]" />
              <span className="text-sm font-bold text-[#991B1B]">Upload could not be processed</span>
            </div>
            <p className="text-sm text-[#991B1B]">{reason}</p>
          </div>
        )}

        {/* ═══ APPROVED: All checks passed ═══ */}
        {passed && (
          <div className="mx-6 mt-4 rounded-xl overflow-hidden border border-[#A7F3D0]">
            <div className="bg-[#059669] px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">✅ UPLOAD APPROVED</span>
            </div>
            <div className="bg-[#ECFDF5] px-4 py-3">
              <p className="text-sm text-[#065F46]">
                All safety checks passed. Content verified as clean and relevant.
              </p>
              <p className="text-xs text-[#047857] mt-1">
                Scanned: {steps.filter(s => s.status === "done").length} checks completed • No violations found
              </p>
            </div>
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
