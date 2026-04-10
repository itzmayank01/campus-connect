"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Headphones, Presentation, GitBranch, FileText, BookOpen,
  HelpCircle, BarChart3, Table2, Loader2, Sparkles,
  FlaskConical, ArrowRight, Video, Youtube, Plus
} from "lucide-react"

import { VideoToolModal } from "@/components/VideoToolModal"
import { AddVideoModal } from "@/components/AddVideoModal"

const DOC_TOOLS = [
  {
    key: "AUDIO_OVERVIEW",
    label: "Audio Overview",
    description: "AI podcast-style audio explanation of your study material with two voices",
    icon: Headphones,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    key: "SLIDE_DECK",
    label: "Slide Deck",
    description: "Auto-generated presentation slides with key concepts and visual structure",
    icon: Presentation,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    key: "MIND_MAP",
    label: "Mind Map",
    description: "Visual concept map showing relationships between topics",
    icon: GitBranch,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    key: "REPORT",
    label: "Study Report",
    description: "Comprehensive analysis report with key takeaways and exam insights",
    icon: FileText,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    key: "FLASHCARDS",
    label: "Flashcards",
    description: "Interactive flip-style flashcards for quick revision and memorization",
    icon: BookOpen,
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    key: "QUIZ",
    label: "Quiz",
    description: "AI-generated multiple choice questions to test your understanding",
    icon: HelpCircle,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    key: "INFOGRAPHIC",
    label: "Infographic",
    description: "Visual data summary with statistics, charts and key figures",
    icon: BarChart3,
    gradient: "from-cyan-500 to-sky-500",
  },
  {
    key: "DATA_TABLE",
    label: "Data Table",
    description: "Structured data extraction into organized, sortable tables",
    icon: Table2,
    gradient: "from-slate-500 to-gray-600",
  },
];

const VIDEO_TOOLS = [
  {
    key: "full-summary",
    label: "Full Summary",
    description: "Comprehensive overview with key takeaways and topics",
    icon: FileText,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    key: "section-summaries",
    label: "Section Summaries",
    description: "Chapter-by-chapter breakdown with exam markers",
    icon: GitBranch,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    key: "study-report",
    label: "Study Report",
    description: "Deep dive with learning outcomes, formulas, and questions",
    icon: BookOpen,
    gradient: "from-amber-500 to-orange-500",
  },
];

interface DocItem {
  id: string;
  title: string;
  fileType: string;
  createdAt: string;
  hasS3Key: boolean;
}

interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  hasTranscript: boolean;
}

export default function StudyLabPage() {
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<"documents" | "videos">("documents")
  const [loading, setLoading] = useState(true)

  const [docs, setDocs] = useState<DocItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Modals
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false)
  const [activeVideoTool, setActiveVideoTool] = useState<{
    tool: "full-summary" | "section-summaries" | "study-report";
    video: VideoItem;
  } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/studylab-bookmarks");
      const data = await res.json();
      setDocs(data.resources ?? []);
      setVideos(data.videos ?? []);
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedId(null)
  }, [activeTab])

  const handleToolClick = (toolKey: string) => {
    if (!selectedId) return

    if (activeTab === "documents") {
      router.push(`/dashboard/study-materials/${selectedId}?openLab=true&tool=${toolKey}`)
    } else {
      const vid = videos.find((v) => v.id === selectedId)
      if (vid) {
        setActiveVideoTool({
          tool: toolKey as any,
          video: vid,
        })
      }
    }
  }

  const activeTools = activeTab === "documents" ? DOC_TOOLS : VIDEO_TOOLS;

  // Combine and deduplicate tools by label to show in the hero header
  const allTools = [...DOC_TOOLS, ...VIDEO_TOOLS].filter(
    (tool, index, self) => index === self.findIndex((t) => t.label === tool.label)
  );

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-8 md:p-10 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-400/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-indigo-400/15 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <FlaskConical className="h-6 w-6 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Study Lab
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/30 border border-violet-400/30 px-2.5 py-0.5 text-[10px] font-bold text-violet-200 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  2.0
                </span>
              </div>
              <p className="text-sm text-indigo-200/70 mt-0.5">
                Transform any document or YouTube video into interactive study tools
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            {allTools.map((tool) => (
              <div key={tool.key} className="flex flex-col items-center text-center w-16">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-lg mb-1.5`}>
                  <tool.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <span className="text-[10px] text-indigo-200/60 font-medium leading-tight">{tool.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Select Resource */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F8EF7] text-white text-sm font-bold shadow-md shadow-[#4F8EF7]/20">1</div>
            <h2 className="text-lg font-bold text-[#0F1117]">Select a Study Material</h2>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-3 p-1.5 bg-[#F1F5F9] rounded-xl w-fit mb-4">
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "documents"
                ? "bg-white text-[#0F1117] shadow-sm"
                : "text-[#64748B] hover:text-[#0F1117]"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "videos"
                ? "bg-white text-[#0F1117] shadow-sm"
                : "text-[#64748B] hover:text-[#0F1117]"
            }`}
          >
            <Video className="w-4 h-4" />
            YouTube Videos
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F8EF7]" />
          </div>
        ) : activeTab === "documents" ? (
          // DOCUMENTS
          docs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center shadow-sm">
              <p className="text-[#64748B]">No bookmarked documents found.</p>
              <Link
                href="/dashboard/study-materials"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline"
              >
                Browse Study Materials
              </Link>
            </div>
          ) : (
            <div className="grid gap-2 max-h-[350px] overflow-y-auto rounded-2xl bg-white border border-[#F1F5F9] p-3 shadow-sm pr-2 custom-scrollbar">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedId(doc.id)}
                  className={`flex items-center gap-4 w-full text-left rounded-xl px-4 py-3 transition-all duration-200 ${
                    selectedId === doc.id
                      ? "bg-[#4F8EF7]/[0.08] border-2 border-[#4F8EF7] shadow-[0_0_12px_rgba(79,142,247,0.12)]"
                      : "bg-[#F8FAFC] border-2 border-transparent hover:bg-[#F1F5F9] hover:border-[#E2E8F0]"
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    selectedId === doc.id ? "bg-[#4F8EF7]/20" : "bg-white border border-[#E2E8F0]"
                  }`}>
                    <FileText className={`h-5 w-5 ${selectedId === doc.id ? "text-[#4F8EF7]" : "text-[#64748B]"}`} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${selectedId === doc.id ? "text-[#4F8EF7]" : "text-[#0F1117]"}`}>
                      {doc.title}
                    </p>
                    <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                      {doc.fileType.includes("pdf") ? "PDF" : "Document"}
                    </p>
                  </div>
                  {selectedId === doc.id && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4F8EF7]">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          // VIDEOS
          <>
            {videos.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center shadow-sm">
                <Youtube className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
                <p className="text-[#64748B] font-medium">No YouTube videos saved yet.</p>
                <button
                  onClick={() => setIsAddVideoOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 text-white font-semibold px-5 py-2.5 shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" /> Add YouTube Video
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsAddVideoOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Video
                  </button>
                </div>
                <div className="grid gap-2 max-h-[350px] overflow-y-auto rounded-2xl bg-white border border-[#F1F5F9] p-3 shadow-sm pr-2 custom-scrollbar">
                  {videos.map((vid) => (
                    <button
                      key={vid.id}
                      onClick={() => setSelectedId(vid.id)}
                      className={`flex items-start gap-4 w-full text-left rounded-xl p-3 transition-all duration-200 ${
                        selectedId === vid.id
                          ? "bg-red-50/[0.4] border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.12)]"
                          : "bg-[#F8FAFC] border-2 border-transparent hover:bg-[#F1F5F9] hover:border-[#E2E8F0]"
                      }`}
                    >
                      <div className="relative w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-black/10 shadow-sm">
                        <img 
                          src={vid.thumbnailUrl} 
                          alt="" 
                          className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Youtube className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <p className={`text-sm font-bold line-clamp-2 leading-snug ${selectedId === vid.id ? "text-red-700" : "text-[#0F1117]"}`}>
                          {vid.title}
                        </p>
                        <p className="text-xs text-[#64748B] font-medium mt-1">
                          {vid.channelName}
                        </p>
                      </div>
                      {selectedId === vid.id && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 shrink-0 self-center mr-2">
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2: Choose AI Tool */}
      <div className={`transition-opacity duration-500 ${!selectedId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-md transition-colors ${
            selectedId 
              ? activeTab === "videos" ? "bg-red-500 text-white shadow-red-500/20" : "bg-[#4F8EF7] text-white shadow-[#4F8EF7]/20" 
              : "bg-[#E2E8F0] text-[#94A3B8] shadow-none"
          }`}>2</div>
          <h2 className={`text-lg font-bold ${selectedId ? "text-[#0F1117]" : "text-[#94A3B8]"}`}>
            Select Strategy
          </h2>
          {!selectedId && (
            <span className="text-xs text-[#94A3B8] font-medium px-3 py-1 bg-[#F1F5F9] rounded-full">← Select a resource first</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeTools.map((tool) => (
            <button
              key={tool.key}
              onClick={() => handleToolClick(tool.key)}
              disabled={!selectedId}
              className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300 ${
                selectedId
                  ? "bg-white border-[#E2E8F0] shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer"
                  : "bg-white border-[#F1F5F9] opacity-50 cursor-not-allowed"
              }`}
            >
              {/* Subtle hover gradient frame */}
              {selectedId && (
                <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10`} />
              )}

              <div className="relative z-10 flex flex-col h-full">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg mb-4 transform group-hover:scale-110 transition-transform duration-300 ease-out`}>
                  <tool.icon className="h-6 w-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-[#0F1117] mb-1.5">{tool.label}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed flex-grow">{tool.description}</p>

                {selectedId && (
                  <div className={`flex items-center gap-1.5 mt-5 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                    activeTab === "videos" ? "text-red-500" : "text-[#4F8EF7]"
                  }`}>
                    Generate Tool
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] p-8 mt-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <FlaskConical className="w-40 h-40" />
        </div>
        <h3 className="text-base font-bold text-[#0F1117] mb-6">How Study Lab Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F8EF7]/10 text-[#4F8EF7] text-sm font-black ring-1 ring-[#4F8EF7]/20">1</div>
            <div>
              <p className="text-sm font-bold text-[#0F1117]">Select Media</p>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">Choose any bookmarked PDF, DOCX from your library, or paste a YouTube URL.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] text-sm font-black ring-1 ring-[#8B5CF6]/20">2</div>
            <div>
              <p className="text-sm font-bold text-[#0F1117]">AI Processing</p>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">Our Groq-powered AI instantly reads your document or parses the video transcript.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#059669]/10 text-[#059669] text-sm font-black ring-1 ring-[#059669]/20">3</div>
            <div>
              <p className="text-sm font-bold text-[#0F1117]">Learn & Revise</p>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">Get section summaries, dynamic flashcards, and comprehensive study reports instantly.</p>
            </div>
          </div>
        </div>
      </div>

      {isAddVideoOpen && (
        <AddVideoModal
          onClose={() => setIsAddVideoOpen(false)}
          onAdded={() => {
            setIsAddVideoOpen(false)
            loadData() // reload list to show new video
          }}
        />
      )}

      {activeVideoTool && (
        <VideoToolModal
          tool={activeVideoTool.tool}
          video={activeVideoTool.video}
          onClose={() => setActiveVideoTool(null)}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
        }
      `}} />
    </div>
  )
}
