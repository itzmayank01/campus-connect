/**
 * @file StudyLabGrid.tsx
 * @description 3-column grid of tool buttons with status indicators.
 */

"use client";

import { Loader2, CheckCircle2, XCircle, Play, Headphones, Presentation, Brain, HelpCircle, BookText, FileBarChart, Video, BarChart3, Table2 } from "lucide-react";
import type { StudyToolMeta, ToolType } from "./StudyLabPanel";

const TOOL_DEFS: Array<{
  type: ToolType;
  label: string;
  icon: typeof Play;
  estimatedSeconds: number;
  color: string;
}> = [
  { type: "AUDIO_OVERVIEW",  label: "Audio",       icon: Headphones,    estimatedSeconds: 90,  color: "text-violet-600" },
  { type: "SLIDE_DECK",      label: "Slides",      icon: Presentation,  estimatedSeconds: 8,   color: "text-blue-600" },
  { type: "MIND_MAP",        label: "Mind Map",    icon: Brain,         estimatedSeconds: 6,   color: "text-emerald-600" },
  { type: "QUIZ",            label: "Quiz",        icon: HelpCircle,    estimatedSeconds: 10,  color: "text-amber-600" },
  { type: "FLASHCARDS",      label: "Flashcards",  icon: BookText,      estimatedSeconds: 8,   color: "text-pink-600" },
  { type: "REPORT",          label: "Report",      icon: FileBarChart,  estimatedSeconds: 14,  color: "text-cyan-600" },
  { type: "VIDEO_OVERVIEW",  label: "Video",       icon: Video,         estimatedSeconds: 120, color: "text-red-600" },
  { type: "INFOGRAPHIC",     label: "Infographic", icon: BarChart3,     estimatedSeconds: 8,   color: "text-indigo-600" },
  { type: "DATA_TABLE",      label: "Data Table",  icon: Table2,        estimatedSeconds: 6,   color: "text-teal-600" },
];

interface StudyLabGridProps {
  tools: StudyToolMeta[];
  onGenerate: (type: ToolType) => void;
  onOpen: (tool: StudyToolMeta) => void;
  onRetry: (type: ToolType) => void;
}

export function StudyLabGrid({ tools, onGenerate, onOpen, onRetry }: StudyLabGridProps) {
  const toolMap = new Map(tools.map((t) => [t.type, t]));

  return (
    <div className="grid grid-cols-3 gap-2">
      {TOOL_DEFS.map(({ type, label, icon: Icon, estimatedSeconds, color }) => {
        const tool = toolMap.get(type);
        const status = tool?.status;

        const isReady = status === "READY";
        const isProcessing = status === "PROCESSING" || status === "PENDING";
        const isFailed = status === "FAILED";
        const isIdle = !status;

        return (
          <button
            key={type}
            disabled={isProcessing}
            onClick={() => {
              if (isReady && tool) onOpen(tool);
              else if (isFailed) onRetry(type);
              else if (isIdle) onGenerate(type);
            }}
            className={[
              "relative flex flex-col items-center justify-center",
              "rounded-xl border py-4 px-2 text-center",
              "transition-all duration-200 text-sm font-medium",
              "min-h-[80px] gap-1.5",
              isReady && "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 hover:shadow-sm",
              isProcessing && "border-indigo-200 bg-indigo-50/80 text-indigo-600 cursor-wait",
              isFailed && "border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100",
              isIdle && "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] hover:shadow-sm",
            ].filter(Boolean).join(" ")}
          >
            {/* Tool icon or status icon */}
            {isReady && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
            {isFailed && <XCircle className="w-5 h-5 text-red-400" />}
            {isIdle && <Icon className={`w-5 h-5 ${color}`} />}

            <span className="leading-tight">{label}</span>

            {isIdle && (
              <span className="text-[10px] text-[#94A3B8] font-normal">
                ~{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.round(estimatedSeconds / 60)}min`}
              </span>
            )}

            {isProcessing && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-100 rounded-b-xl overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full animate-pulse" style={{ width: "66%" }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
