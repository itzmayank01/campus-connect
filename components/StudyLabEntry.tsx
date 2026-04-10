/**
 * @file StudyLabEntry.tsx
 * @description The new StudyLab panel — two tabs: Documents and Videos.
 * Shows only bookmarked/downloaded content. The user picks content first,
 * then sees the relevant AI tools.
 *
 * STATE FLOW:
 * idle (tab picker)
 *   → content picker (bookmarked documents OR saved videos)
 *     → tool picker (9 tools for docs, 3 tools for videos)
 *       → generating → result modal
 */

"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  FileText,
  Play,
  Plus,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { AddVideoModal } from "./AddVideoModal";
import { VideoToolModal } from "./VideoToolModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "documents" | "videos";
type Stage = "tab" | "picker" | "tools";
type DocTool =
  | "AUDIO_OVERVIEW"
  | "SLIDE_DECK"
  | "MIND_MAP"
  | "QUIZ"
  | "FLASHCARDS"
  | "REPORT"
  | "VIDEO_OVERVIEW"
  | "INFOGRAPHIC"
  | "DATA_TABLE";
type VideoTool = "full-summary" | "section-summaries" | "study-report";

interface DocItem {
  id: string;
  title: string;
  fileType: string;
  createdAt: string;
  hasS3Key: boolean;
}
interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  youtubeId: string;
  hasTranscript: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Document tool definitions ─────────────────────────────────────────────────

const DOC_TOOLS: {
  type: DocTool;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    type: "AUDIO_OVERVIEW",
    label: "Audio",
    icon: "🎙",
    desc: "2-voice podcast",
  },
  {
    type: "SLIDE_DECK",
    label: "Slides",
    icon: "🖼",
    desc: "10-slide deck",
  },
  {
    type: "MIND_MAP",
    label: "Mind Map",
    icon: "🧠",
    desc: "Interactive map",
  },
  { type: "QUIZ", label: "Quiz", icon: "❓", desc: "18 questions" },
  {
    type: "FLASHCARDS",
    label: "Flashcards",
    icon: "📇",
    desc: "20 cards + SRS",
  },
  { type: "REPORT", label: "Report", icon: "📋", desc: "Study report" },
  {
    type: "VIDEO_OVERVIEW",
    label: "Video",
    icon: "🎬",
    desc: "Narrated slides",
  },
  {
    type: "INFOGRAPHIC",
    label: "Infographic",
    icon: "📊",
    desc: "Visual facts",
  },
  {
    type: "DATA_TABLE",
    label: "Data Table",
    icon: "📦",
    desc: "Structured data",
  },
];

// ── Video tool definitions ────────────────────────────────────────────────────

const VIDEO_TOOLS: {
  type: VideoTool;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    type: "full-summary",
    label: "Full Summary",
    icon: "📝",
    desc: "Entire video in one summary",
  },
  {
    type: "section-summaries",
    label: "Section Summaries",
    icon: "🗂",
    desc: "Chapter-by-chapter breakdown",
  },
  {
    type: "study-report",
    label: "Study Report",
    icon: "📚",
    desc: "Concepts, formulas, questions",
  },
];

// ── Main component ────────────────────────────────────────────────────────────

interface StudyLabEntryProps {
  /** If provided, pre-select this resource in Documents tab and skip to tools */
  preselectedResourceId?: string;
  preselectedResourceTitle?: string;
  /** Start expanded? */
  defaultOpen?: boolean;
}

export function StudyLabEntry({
  preselectedResourceId,
  preselectedResourceTitle,
  defaultOpen = false,
}: StudyLabEntryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [stage, setStage] = useState<Stage>(
    preselectedResourceId ? "tools" : "tab"
  );
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(
    preselectedResourceId
      ? {
          id: preselectedResourceId,
          title: preselectedResourceTitle ?? "Document",
          fileType: "application/pdf",
          createdAt: "",
          hasS3Key: true,
        }
      : null
  );
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [activeTool, setActiveTool] = useState<DocTool | VideoTool | null>(
    null
  );
  const [showAddVideo, setShowAddVideo] = useState(false);

  // ── Document tool generation (reuses existing /api/study-tools/generate) ──
  const [docGenerating, setDocGenerating] = useState(false);
  const [docToolId, setDocToolId] = useState<string | null>(null);
  const [docToolError, setDocToolError] = useState<string | null>(null);

  // Fetch bookmarked content
  const { data: bookmarkData, mutate: mutateBookmarks } = useSWR(
    isOpen ? "/api/studylab-bookmarks" : null,
    fetcher
  );

  const bookmarkedDocs: DocItem[] = bookmarkData?.documents ?? [];
  const bookmarkedVideos: VideoItem[] = bookmarkData?.videos ?? [];

  // Reset state when closing
  const close = () => {
    setIsOpen(false);
    setStage(preselectedResourceId ? "tools" : "tab");
    if (!preselectedResourceId) setSelectedDoc(null);
    setSelectedVideo(null);
    setActiveTool(null);
    setDocToolId(null);
    setDocToolError(null);
    setDocGenerating(false);
  };

  // ── Document tool generation handler ──
  const handleDocToolClick = async (type: DocTool) => {
    if (!selectedDoc) return;
    setActiveTool(type);
    setDocGenerating(true);
    setDocToolId(null);
    setDocToolError(null);

    try {
      const res = await fetch("/api/study-tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: selectedDoc.id, type }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDocToolError(json.error ?? "Generation failed");
        return;
      }
      setDocToolId(json.toolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setDocToolError(message);
    } finally {
      setDocGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="mt-6 border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.134-.606c-1.716-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#0F1117]">
                StudyLab 2.0
              </p>
              <p className="text-xs text-[#64748B]">
                Documents &amp; YouTube videos — AI study tools
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
              Open
            </span>
            <svg
              className="w-4 h-4 text-[#94A3B8]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-indigo-50/50 to-purple-50/50 shrink-0">
          <div className="flex items-center gap-3">
            {stage !== "tab" && !preselectedResourceId && (
              <button
                onClick={() => {
                  if (stage === "tools") setStage("picker");
                  if (stage === "picker") {
                    setStage("tab");
                    setSelectedDoc(null);
                    setSelectedVideo(null);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-white/70 text-[#94A3B8]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.134-.606c-1.716-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#0F1117]">
                {stage === "tab"
                  ? "StudyLab 2.0"
                  : stage === "picker"
                    ? activeTab === "documents"
                      ? "Choose a document"
                      : "Choose a video"
                    : selectedDoc?.title ?? selectedVideo?.title ?? "StudyLab"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {stage === "tab"
                  ? "Choose content type to study"
                  : stage === "tools"
                    ? activeTab === "documents"
                      ? "9 AI tools available"
                      : "3 AI tools available"
                    : "Select content from your saved items"}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="text-[#94A3B8] hover:text-[#64748B] p-1.5 rounded-lg hover:bg-white/50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* ── STAGE: TAB PICKER ── */}
          {stage === "tab" && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {/* Documents tab */}
                <button
                  onClick={() => {
                    setActiveTab("documents");
                    setStage("picker");
                  }}
                  className="flex flex-col items-start p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#93C5FD] hover:bg-blue-50/50 transition-colors group text-left"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-[#0F1117] mb-1">
                    Documents
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    PDFs, notes, study materials
                  </span>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-blue-600 font-medium">
                      9 AI tools
                    </span>
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                  </div>
                </button>

                {/* Videos tab */}
                <button
                  onClick={() => {
                    setActiveTab("videos");
                    setStage("picker");
                  }}
                  className="flex flex-col items-start p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-red-200 hover:bg-red-50/50 transition-colors group text-left"
                >
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
                    <Play className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-sm font-semibold text-[#0F1117] mb-1">
                    Videos
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    YouTube lectures, tutorials
                  </span>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-red-500 font-medium">
                      3 AI tools
                    </span>
                    <ChevronRight className="w-3 h-3 text-red-400" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE: DOCUMENT PICKER ── */}
          {stage === "picker" && activeTab === "documents" && (
            <div>
              {bookmarkedDocs.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#334155] mb-1">
                    No saved documents
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Bookmark or download study materials — they&apos;ll appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarkedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setStage("tools");
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#93C5FD] hover:bg-blue-50/30 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F1117] truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          {doc.fileType.includes("pdf") ? "PDF" : "Document"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STAGE: VIDEO PICKER ── */}
          {stage === "picker" && activeTab === "videos" && (
            <div>
              {/* Add video button */}
              <button
                onClick={() => setShowAddVideo(true)}
                className="w-full flex items-center justify-center gap-2 p-3 mb-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 text-red-600 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add YouTube video
              </button>

              {bookmarkedVideos.length === 0 ? (
                <div className="text-center py-8">
                  <Play className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#334155] mb-1">
                    No videos saved yet
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Click &ldquo;Add YouTube video&rdquo; above to paste a
                    lecture URL.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarkedVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        if (!video.hasTranscript) return;
                        setSelectedVideo(video);
                        setStage("tools");
                      }}
                      className={`w-full flex items-center gap-3 p-3 bg-white border rounded-xl transition-colors text-left ${
                        video.hasTranscript
                          ? "border-[#E2E8F0] hover:border-red-200 hover:bg-red-50/30"
                          : "border-[#F1F5F9] opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-[#F1F5F9] flex-shrink-0">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="w-4 h-4 text-[#94A3B8] m-auto mt-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F1117] truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-[#94A3B8] truncate">
                          {video.channelName}
                        </p>
                        {!video.hasTranscript && (
                          <p className="text-xs text-red-400 mt-0.5">
                            No captions — AI tools unavailable
                          </p>
                        )}
                      </div>
                      {video.hasTranscript && (
                        <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STAGE: DOCUMENT TOOLS ── */}
          {stage === "tools" && activeTab === "documents" && selectedDoc && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {DOC_TOOLS.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => handleDocToolClick(type)}
                    className="flex flex-col items-center py-4 px-2 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#93C5FD] hover:bg-blue-50/50 transition-colors group"
                  >
                    <span
                      style={{
                        fontSize: "20px",
                        lineHeight: 1,
                        marginBottom: "6px",
                      }}
                    >
                      {icon}
                    </span>
                    <span className="text-xs font-medium text-[#334155] group-hover:text-blue-700">
                      {label}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] mt-0.5 text-center leading-tight">
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STAGE: VIDEO TOOLS ── */}
          {stage === "tools" && activeTab === "videos" && selectedVideo && (
            <div>
              {/* Video preview */}
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl mb-4">
                <img
                  src={selectedVideo.thumbnailUrl}
                  alt=""
                  className="w-14 h-10 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F1117] truncate">
                    {selectedVideo.title}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {selectedVideo.channelName}
                  </p>
                </div>
              </div>
              {/* 3 tool options */}
              <div className="space-y-2">
                {VIDEO_TOOLS.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => setActiveTool(type as VideoTool)}
                    className="w-full flex items-center gap-4 p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-red-200 hover:bg-red-50/50 transition-colors text-left group"
                  >
                    <span
                      style={{
                        fontSize: "22px",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0F1117] group-hover:text-red-700">
                        {label}
                      </p>
                      <p className="text-xs text-[#94A3B8]">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-red-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Document tool modal — reuse existing StudyLabModal via dynamic import ── */}
      {activeTool &&
        selectedDoc &&
        activeTab === "documents" &&
        (() => {
          // Import the existing StudyLabModal lazily to avoid circular deps
          const StudyLabModal =
            require("./StudyLabModal").StudyLabModal;
          return (
            <StudyLabModal
              toolId={
                docToolError
                  ? `error:${docToolError}`
                  : docGenerating
                    ? null
                    : docToolId
              }
              toolType={activeTool as DocTool}
              resourceTitle={selectedDoc.title}
              onClose={() => {
                setActiveTool(null);
                setDocToolId(null);
                setDocToolError(null);
              }}
            />
          );
        })()}

      {/* ── Video tool modal ── */}
      {activeTool && selectedVideo && activeTab === "videos" && (
        <VideoToolModal
          tool={activeTool as VideoTool}
          video={selectedVideo}
          onClose={() => setActiveTool(null)}
        />
      )}

      {/* ── Add Video modal ── */}
      {showAddVideo && (
        <AddVideoModal
          onClose={() => setShowAddVideo(false)}
          onAdded={() => {
            setShowAddVideo(false);
            mutateBookmarks();
          }}
        />
      )}
    </>
  );
}
