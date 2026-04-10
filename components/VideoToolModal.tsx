/**
 * @file VideoToolModal.tsx
 * @description Full-screen modal that generates and displays video AI tool output.
 * Supports: full-summary, section-summaries, study-report.
 * Auto-fires generation on mount, shows loading → result.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
}

interface VideoToolModalProps {
  tool: "full-summary" | "section-summaries" | "study-report";
  video: VideoItem;
  onClose: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  "full-summary": "📝 Full Summary",
  "section-summaries": "🗂 Section Summaries",
  "study-report": "📚 Study Report",
};

const GENERATING_MESSAGES: Record<string, string> = {
  "full-summary": "Summarising the full video…",
  "section-summaries": "Identifying sections and summarising…",
  "study-report": "Building your study report…",
};

export function VideoToolModal({ tool, video, onClose }: VideoToolModalProps) {
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const res = await fetch(`/api/video-tools/${video.id}/${tool}`, {
          method: "POST",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Generation failed");
          return;
        }
        setOutput(data);
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    generate();
    return () => {
      cancelled = true;
    };
  }, [tool, video.id]);

  // Close on Escape key and lock scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
        <div>
          <h2 className="text-base font-semibold text-[#0F1117]">
            {TOOL_LABELS[tool]}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[60vw]">
            {video.title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            {/* Animated orb — same as document tool modal */}
            <div className="relative w-20 h-20 mb-2">
              <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-20" />
              <div className="absolute inset-2 rounded-full bg-red-50 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#0F1117]">
              {GENERATING_MESSAGES[tool]}
            </p>
            <p className="text-xs text-[#94A3B8]">
              Reading transcript · Calling AI · Structuring output…
            </p>
            <p className="text-xs text-[#CBD5E1] mt-1">
              Usually takes 10–30 seconds
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <span className="text-red-500 text-2xl">✕</span>
            </div>
            <p className="text-sm font-semibold text-[#0F1117] mb-2">
              Generation failed
            </p>
            <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">
              {error}
            </p>
            <button
              onClick={onClose}
              className="mt-6 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-colors font-medium"
            >
              Close and retry
            </button>
          </div>
        )}

        {!loading && !error && output && (
          <VideoToolOutput tool={tool} data={output} />
        )}
      </div>
    </div>
  );
}

// ── Output renderer ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VideoToolOutput({ tool, data }: { tool: string; data: any }) {
  if (tool === "full-summary") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h3 className="text-lg font-bold text-[#0F1117] mb-1">
            {data.title as string}
          </h3>
          {data.duration_summary && (
            <p className="text-xs text-[#94A3B8] mb-3">
              {data.duration_summary as string}
            </p>
          )}
          <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">
            {data.summary as string}
          </p>
        </div>

        {(data.key_points as string[])?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
              Key Takeaways
            </h4>
            <div className="space-y-2">
              {(data.key_points as string[]).map((pt, i) => (
                <div
                  key={i}
                  className="flex gap-3 text-sm text-[#334155] p-2.5 bg-[#F8FAFC] rounded-lg"
                >
                  <span className="text-indigo-400 font-semibold mt-0.5 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data.topics_covered as string[])?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Topics Covered
            </h4>
            <div className="flex flex-wrap gap-2">
              {(data.topics_covered as string[]).map((t, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.recommended_for && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-xs font-semibold text-emerald-800 mb-1">
              Recommended for
            </p>
            <p className="text-xs text-emerald-700">
              {data.recommended_for as string}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (tool === "section-summaries") {
    const sections = data.sections as Array<Record<string, unknown>>;
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {data.overall_structure && (
          <p className="text-sm text-[#64748B] mb-2">
            {data.overall_structure as string}
          </p>
        )}
        {sections?.map((s, i) => (
          <div
            key={i}
            className="p-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {(s.section_number as number) ?? i + 1}
                </span>
                <h4 className="text-sm font-semibold text-[#0F1117]">
                  {s.title as string}
                </h4>
              </div>
              <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                {s.approximate_position as string}
              </span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed mb-2">
              {s.summary as string}
            </p>
            {(s.key_concepts as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(s.key_concepts as string[]).map((c, j) => (
                  <span
                    key={j}
                    className="text-[10px] px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[#64748B]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {Boolean(s.important_for_exam) && (
              <span className="mt-2 inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                ⚡ Likely exam topic
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // study-report
  const keyConcepts = data.key_concepts as Array<Record<string, unknown>>;
  const studyQs = data.study_questions as string[];
  const formulas = data.formulas_or_rules as Array<Record<string, unknown>>;
  const summaryObj = data.summary as Record<string, unknown>;
  const furtherReading = data.further_reading as string[];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[#0F1117] mb-1">
          {data.title as string}
        </h3>
        {data.subject_area && (
          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
            {data.subject_area as string}
          </span>
        )}
        {summaryObj?.overview && (
          <p className="text-sm text-[#64748B] mt-2">
            {summaryObj.overview as string}
          </p>
        )}
        {(summaryObj?.learning_outcomes as string[])?.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Learning Outcomes
            </h4>
            <ul className="space-y-1">
              {(summaryObj.learning_outcomes as string[]).map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#334155]">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Concepts */}
      {keyConcepts?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Key Concepts
          </h4>
          <div className="space-y-2">
            {keyConcepts.map((c, i) => (
              <div
                key={i}
                className="p-3 border border-[#F1F5F9] bg-[#F8FAFC] rounded-xl"
              >
                <p className="text-sm font-semibold text-[#0F1117] mb-0.5">
                  {c.term as string}
                </p>
                <p className="text-xs text-[#64748B]">
                  {c.definition as string}
                </p>
                {Boolean(c.timestamp_hint) && (
                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    📍 {c.timestamp_hint as string}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulas */}
      {formulas?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Formulas &amp; Rules
          </h4>
          <div className="space-y-2">
            {formulas.map((f, i) => (
              <div
                key={i}
                className="p-3 border border-amber-100 bg-amber-50/50 rounded-xl"
              >
                <p className="text-sm font-semibold text-[#0F1117]">
                  {f.name as string}
                </p>
                <p className="text-sm font-mono text-indigo-700 mt-1">
                  {f.expression as string}
                </p>
                {Boolean(f.context) && (
                  <p className="text-xs text-[#64748B] mt-1">
                    {f.context as string}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Questions */}
      {studyQs?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Study Questions
          </h4>
          <ol className="space-y-2">
            {studyQs.map((q, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-[#334155] p-2.5 bg-[#F8FAFC] rounded-lg"
              >
                <span className="text-indigo-400 font-bold flex-shrink-0">
                  Q{i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Further Reading */}
      {furtherReading?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            Further Reading
          </h4>
          <div className="flex flex-wrap gap-2">
            {furtherReading.map((t, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 bg-[#F1F5F9] text-[#475569] rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
