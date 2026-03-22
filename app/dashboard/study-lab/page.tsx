"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Headphones, Presentation, GitBranch, FileText, BookOpen,
  HelpCircle, BarChart3, Table2, Loader2, ChevronRight, Sparkles,
  FlaskConical, ArrowRight
} from "lucide-react"

const TOOL_DEFINITIONS = [
  {
    key: "AUDIO_OVERVIEW",
    label: "Audio Overview",
    description: "AI podcast-style audio explanation of your study material with two voices",
    icon: Headphones,
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "violet",
  },
  {
    key: "SLIDE_DECK",
    label: "Slide Deck",
    description: "Auto-generated presentation slides with key concepts and visual structure",
    icon: Presentation,
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "blue",
  },

  {
    key: "MIND_MAP",
    label: "Mind Map",
    description: "Visual concept map showing relationships between topics",
    icon: GitBranch,
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "emerald",
  },
  {
    key: "REPORT",
    label: "Study Report",
    description: "Comprehensive analysis report with key takeaways and exam insights",
    icon: FileText,
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "amber",
  },
  {
    key: "FLASHCARDS",
    label: "Flashcards",
    description: "Interactive flip-style flashcards for quick revision and memorization",
    icon: BookOpen,
    gradient: "from-indigo-500 to-blue-500",
    bgGlow: "indigo",
  },
  {
    key: "QUIZ",
    label: "Quiz",
    description: "AI-generated multiple choice questions to test your understanding",
    icon: HelpCircle,
    gradient: "from-pink-500 to-rose-500",
    bgGlow: "pink",
  },
  {
    key: "INFOGRAPHIC",
    label: "Infographic",
    description: "Visual data summary with statistics, charts and key figures",
    icon: BarChart3,
    gradient: "from-cyan-500 to-sky-500",
    bgGlow: "cyan",
  },
  {
    key: "DATA_TABLE",
    label: "Data Table",
    description: "Structured data extraction into organized, sortable tables",
    icon: Table2,
    gradient: "from-slate-500 to-gray-600",
    bgGlow: "slate",
  },
]

interface ResourceItem {
  id: string
  originalFilename: string
  mimeType: string
  resourceType: string
  subject?: { name: string; code: string }
  downloadCount: number
  createdAt: string
}

export default function StudyLabPage() {
  const router = useRouter()
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResource, setSelectedResource] = useState<string | null>(null)

  useEffect(() => {
    // Fetch all resources that can use Study Lab (PDFs, DOCX, etc.)
    fetch("/api/resources?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.resources)) {
          // Filter to supported file types (not YouTube)
          const supported = data.resources.filter(
            (r: ResourceItem) => r.mimeType !== "youtube"
          )
          setResources(supported)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleToolClick = (toolKey: string) => {
    if (!selectedResource) return
    // Navigate to the resource detail page with Study Lab open
    router.push(`/dashboard/study-materials/${selectedResource}?openLab=true&tool=${toolKey}`)
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-8 md:p-10">
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
                  AI Powered
                </span>
              </div>
              <p className="text-sm text-indigo-200/70 mt-0.5">
                Transform any study material into 8 different AI-powered learning tools
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-6">
            {TOOL_DEFINITIONS.map((tool) => (
              <div key={tool.key} className="flex flex-col items-center text-center">
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
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F8EF7] text-white text-sm font-bold">1</div>
          <h2 className="text-lg font-bold text-[#0F1117]">Select a Study Material</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F8EF7]" />
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 text-center shadow-sm">
            <p className="text-[#64748B]">No study materials found. Upload a PDF or document to get started.</p>
            <Link
              href="/dashboard/upload/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline"
            >
              Upload Material
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 max-h-[300px] overflow-y-auto rounded-2xl bg-white border border-[#F1F5F9] p-3 shadow-sm">
            {resources.map((res) => (
              <button
                key={res.id}
                onClick={() => setSelectedResource(res.id)}
                className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-3 transition-all duration-200 ${
                  selectedResource === res.id
                    ? "bg-[#4F8EF7]/[0.08] border-2 border-[#4F8EF7] shadow-[0_0_12px_rgba(79,142,247,0.12)]"
                    : "bg-[#F8FAFC] border-2 border-transparent hover:bg-[#F1F5F9] hover:border-[#E2E8F0]"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  selectedResource === res.id ? "bg-[#4F8EF7]/20" : "bg-[#F1F3F9]"
                }`}>
                  <FileText className={`h-5 w-5 ${selectedResource === res.id ? "text-[#4F8EF7]" : "text-[#6B7280]"}`} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${selectedResource === res.id ? "text-[#4F8EF7]" : "text-[#0F1117]"}`}>
                    {res.originalFilename}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {res.subject?.name || "General"} • {res.resourceType} • {res.downloadCount} downloads
                  </p>
                </div>
                {selectedResource === res.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4F8EF7]">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Choose AI Tool */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            selectedResource ? "bg-[#4F8EF7] text-white" : "bg-[#E2E8F0] text-[#94A3B8]"
          }`}>2</div>
          <h2 className={`text-lg font-bold ${selectedResource ? "text-[#0F1117]" : "text-[#94A3B8]"}`}>
            Choose an AI Tool
          </h2>
          {!selectedResource && (
            <span className="text-xs text-[#94A3B8]">← Select a resource first</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOL_DEFINITIONS.map((tool) => (
            <button
              key={tool.key}
              onClick={() => handleToolClick(tool.key)}
              disabled={!selectedResource}
              className={`group relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-300 ${
                selectedResource
                  ? "bg-white border-[#F1F5F9] shadow-sm hover:shadow-lg hover:border-[#E2E8F0] hover:-translate-y-0.5 cursor-pointer"
                  : "bg-[#FAFBFC] border-[#F1F5F9] opacity-50 cursor-not-allowed"
              }`}
            >
              {/* Glow effect on hover */}
              {selectedResource && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
              )}

              <div className="relative z-10">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-lg mb-3`}>
                  <tool.icon className="h-6 w-6 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-[#0F1117] mb-1">{tool.label}</h3>
                <p className="text-[12px] text-[#64748B] leading-relaxed">{tool.description}</p>

                {selectedResource && (
                  <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#4F8EF7] opacity-0 group-hover:opacity-100 transition-opacity">
                    Generate
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] p-6">
        <h3 className="text-sm font-bold text-[#334155] mb-3">How Study Lab Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4F8EF7]/10 text-[#4F8EF7] text-xs font-bold">1</div>
            <div>
              <p className="text-xs font-semibold text-[#0F1117]">Upload or Select</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Choose any PDF, DOCX, or document from your study materials</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold">2</div>
            <div>
              <p className="text-xs font-semibold text-[#0F1117]">AI Processing</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Our AI reads your document and generates the selected learning tool</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669] text-xs font-bold">3</div>
            <div>
              <p className="text-xs font-semibold text-[#0F1117]">Learn & Revise</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Use generated flashcards, quizzes, mind maps and more to study smarter</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
