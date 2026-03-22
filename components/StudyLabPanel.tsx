/**
 * @file StudyLabPanel.tsx
 * @description The main StudyLab panel shown on the resource detail page.
 * Collapsed by default — student clicks "Open StudyLab" to reveal tools.
 * Each tool shows its status and opens in a modal when ready.
 */

"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { StudyLabGrid } from "./StudyLabGrid";
import { StudyLabModal } from "./StudyLabModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type ToolType =
  | "AUDIO_OVERVIEW" | "SLIDE_DECK" | "MIND_MAP" | "QUIZ"
  | "FLASHCARDS" | "REPORT" | "VIDEO_OVERVIEW"
  | "INFOGRAPHIC" | "DATA_TABLE";

export interface StudyToolMeta {
  id: string;
  type: ToolType;
  status: ToolStatus;
  generatedAt?: string;
  errorMessage?: string;
}

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudyLabPanelProps {
  resourceId: string;
  resourceTitle: string;
  defaultOpen?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudyLabPanel({ resourceId, resourceTitle, defaultOpen = false }: StudyLabPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [activeToolType, setActiveToolType] = useState<ToolType | null>(null);

  const { data, mutate } = useSWR<{ tools: StudyToolMeta[] }>(
    isOpen ? `/api/study-tools?resourceId=${resourceId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        const hasActive = latestData?.tools?.some(
          (t) => t.status === "PENDING" || t.status === "PROCESSING"
        );
        return hasActive ? 3000 : 0;
      },
    }
  );

  const tools = data?.tools ?? [];
  const readyCount = tools.filter((t) => t.status === "READY").length;

  const handleGenerate = useCallback(async (type: ToolType) => {
    const res = await fetch("/api/study-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, type }),
    });
    if (res.ok) mutate();
  }, [resourceId, mutate]);

  const handleOpen = useCallback((tool: StudyToolMeta) => {
    setActiveToolId(tool.id);
    setActiveToolType(tool.type);
  }, []);

  const handleRetry = useCallback(async (type: ToolType) => {
    const failedTool = tools.find((t) => t.type === type && t.status === "FAILED");
    if (failedTool) {
      await fetch(`/api/study-tools/${failedTool.id}`, { method: "DELETE" });
    }
    handleGenerate(type);
  }, [tools, handleGenerate]);

  return (
    <>
      {/* Collapsed trigger */}
      {!isOpen && (
        <div className="mt-6 border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.134-.606c-1.716-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#0F1117]">StudyLab</p>
                <p className="text-xs text-[#64748B]">8 AI study tools — podcasts, quizzes, mind maps & more</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Open</span>
              <svg className="w-4 h-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div className="mt-6 border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.134-.606c-1.716-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F1117]">StudyLab</p>
                <p className="text-xs text-[#64748B]">Select a tool to generate from this document</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {readyCount > 0 && (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                  {readyCount} ready
                </span>
              )}
              <button onClick={() => setIsOpen(false)} className="text-[#94A3B8] hover:text-[#64748B] p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tool grid */}
          <div className="p-4">
            <StudyLabGrid
              tools={tools}
              onGenerate={handleGenerate}
              onOpen={handleOpen}
              onRetry={handleRetry}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {activeToolId && activeToolType && (
        <StudyLabModal
          toolId={activeToolId}
          toolType={activeToolType}
          resourceTitle={resourceTitle}
          onClose={() => {
            setActiveToolId(null);
            setActiveToolType(null);
          }}
        />
      )}
    </>
  );
}
