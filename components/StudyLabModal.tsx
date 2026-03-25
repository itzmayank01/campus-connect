/**
 * @file StudyLabModal.tsx
 * @description Full-screen modal that renders the active study tool.
 *
 * Accepts toolId as string | null:
 *   null          → still generating (shows animated progress)
 *   "error:msg"   → generation failed (shows error + retry option)
 *   "abc123..."   → ready (fetches full output and renders viewer)
 */

"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import type { ToolType } from "./StudyLabPanel";
import { StudyLabProgress } from "./StudyLabProgress";

// ─── Viewer components ────────────────────────────────────────────────────────

import { MindMapViewer }      from "./tools/MindMapViewer";
import { FlashcardViewer }    from "./tools/FlashcardViewer";
import { QuizViewer }         from "./tools/QuizViewer";
import { SlideViewer }        from "./tools/SlideViewer";
import { ReportViewer }       from "./tools/ReportViewer";
import { InfographicViewer }  from "./tools/InfographicViewer";
import { DataTableViewer }    from "./tools/DataTableViewer";
import { PodcastPlayer }      from "./tools/PodcastPlayer";
import { VideoOverviewPlayer } from "./tools/VideoOverviewPlayer";

interface StudyLabModalProps {
  toolId:        string | null;
  toolType:      ToolType;
  resourceTitle: string;
  isRefreshing?: boolean;
  onRefresh?:    () => void;
  onClose:       () => void;
}

const TOOL_LABELS: Record<ToolType, string> = {
  AUDIO_OVERVIEW: "🎧 Audio Overview",
  SLIDE_DECK:     "📊 Slide Deck",
  MIND_MAP:       "🧠 Mind Map",
  QUIZ:           "❓ Quiz",
  FLASHCARDS:     "📚 Flashcards",
  REPORT:         "📝 Study Report",
  VIDEO_OVERVIEW: "🎬 Video Overview",
  INFOGRAPHIC:    "📈 Infographic",
  DATA_TABLE:     "📋 Data Table",
};

const GENERATING_MESSAGES: Record<ToolType, string> = {
  MIND_MAP:       "Building your knowledge map…",
  FLASHCARDS:     "Creating flashcards…",
  QUIZ:           "Generating quiz questions…",
  SLIDE_DECK:     "Building slide deck…",
  REPORT:         "Writing study report…",
  AUDIO_OVERVIEW: "Generating audio overview…",
  VIDEO_OVERVIEW: "Generating video overview…",
  INFOGRAPHIC:    "Building infographic…",
  DATA_TABLE:     "Extracting data table…",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StudyLabModal({ toolId, toolType, resourceTitle, isRefreshing = false, onRefresh, onClose }: StudyLabModalProps) {
  // Only fetch when we have a real toolId (not null and not error prefix)
  const isGenerating = toolId === null;
  const isError      = typeof toolId === "string" && toolId.startsWith("error:");
  const realToolId   = (toolId && !isError) ? toolId : null;

  const { data } = useSWR(
    realToolId ? `/api/study-tools/${realToolId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        if (!latestData) return 1000;
        const status = latestData?.status;
        if (status === "READY" || status === "FAILED") return 0;
        return 1500;
      },
    }
  );

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Render content ─────────────────────────────────────────────────────────
  const renderContent = () => {
    // 1. Generating: toolId is null — show animated progress
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          {/* Animated orb */}
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-20" />
            <div className="absolute inset-2 rounded-full bg-indigo-50 animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-semibold text-[#0F1117] mb-1">
            {GENERATING_MESSAGES[toolType]}
          </p>
          <p className="text-xs text-[#94A3B8]">Fetching PDF · Extracting text · Calling AI…</p>
          <p className="text-xs text-[#CBD5E1] mt-2">Usually takes 10–30 seconds</p>
        </div>
      );
    }

    // 2. Error: toolId is "error:message"
    if (isError) {
      const errorMessage = toolId!.replace(/^error:/, "");
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">✕</span>
          </div>
          <p className="text-sm font-semibold text-[#0F1117] mb-2">Generation failed</p>
          <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">{errorMessage}</p>
          <button
            onClick={onClose}
            className="mt-6 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-colors font-medium"
          >
            Close and retry
          </button>
        </div>
      );
    }

    // 3. Have a toolId — delegate to the existing polling-based progress/viewer
    if (!data || data.status !== "READY") {
      return <StudyLabProgress toolId={realToolId!} />;
    }

    const output = data.output;

    switch (toolType) {
      case "MIND_MAP":       return <MindMapViewer {...output} />;
      case "FLASHCARDS":     return <FlashcardViewer {...output} />;
      case "QUIZ":           return <QuizViewer {...output} />;
      case "SLIDE_DECK":     return <SlideViewer {...output} />;
      case "REPORT":         return <ReportViewer {...output} />;
      case "INFOGRAPHIC":    return <InfographicViewer {...output} />;
      case "DATA_TABLE":     return <DataTableViewer {...output} />;
      case "AUDIO_OVERVIEW": return <PodcastPlayer {...output} />;
      case "VIDEO_OVERVIEW": return <VideoOverviewPlayer {...output} />;
      default:               return <div className="p-8 text-center text-[#64748B]">Unknown tool type</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
        <div>
          <h2 className="text-base font-semibold text-[#0F1117]">
            {TOOL_LABELS[toolType]}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[60vw]">{resourceTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button — shown when tool is READY or after generation */}
          {onRefresh && !isGenerating && (toolId && !isError) && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Regenerate fresh from document"
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                isRefreshing
                  ? "border-indigo-200 text-indigo-400 cursor-wait bg-indigo-50"
                  : "border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer",
              ].join(" ")}
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isRefreshing ? "Regenerating…" : "↺ Refresh"}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
