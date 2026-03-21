/**
 * @file StudyLabModal.tsx
 * @description Full-screen modal that renders the active study tool.
 * Fetches full tool data (with outputJson) and renders the correct viewer.
 */

"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import type { ToolType } from "./StudyLabPanel";
import { StudyLabProgress } from "./StudyLabProgress";

// ─── Viewer components ────────────────────────────────────────────────────────

import { MindMapViewer } from "./tools/MindMapViewer";
import { FlashcardViewer } from "./tools/FlashcardViewer";
import { QuizViewer } from "./tools/QuizViewer";
import { SlideViewer } from "./tools/SlideViewer";
import { ReportViewer } from "./tools/ReportViewer";
import { InfographicViewer } from "./tools/InfographicViewer";
import { DataTableViewer } from "./tools/DataTableViewer";
import { PodcastPlayer } from "./tools/PodcastPlayer";
import { VideoOverviewPlayer } from "./tools/VideoOverviewPlayer";

interface StudyLabModalProps {
  toolId: string;
  toolType: ToolType;
  resourceTitle: string;
  onClose: () => void;
}

const TOOL_LABELS: Record<ToolType, string> = {
  AUDIO_OVERVIEW: "🎧 Audio Overview",
  SLIDE_DECK: "📊 Slide Deck",
  MIND_MAP: "🧠 Mind Map",
  QUIZ: "❓ Quiz",
  FLASHCARDS: "📚 Flashcards",
  REPORT: "📝 Study Report",
  VIDEO_OVERVIEW: "🎬 Video Overview",
  INFOGRAPHIC: "📈 Infographic",
  DATA_TABLE: "📋 Data Table",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StudyLabModal({ toolId, toolType, resourceTitle, onClose }: StudyLabModalProps) {
  const { data } = useSWR(`/api/study-tools/${toolId}`, fetcher, { refreshInterval: 3000 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const renderViewer = () => {
    if (!data || data.status !== "READY") {
      return <StudyLabProgress toolId={toolId} />;
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
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderViewer()}
      </div>
    </div>
  );
}
