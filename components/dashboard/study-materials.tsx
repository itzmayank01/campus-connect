"use client"

import { useState } from "react"
import { Download, FileText, Video, HelpCircle, BookOpen, Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type MaterialType = "notes" | "question_papers" | "videos" | "reference"

interface Material {
  id: string
  title: string
  subject: string
  type: MaterialType
  format: string
  size: string
  semester: string | number
  downloads: number
}

interface StudyMaterialsProps {
  initialMaterials?: Material[]
}

const tabs: { label: string; value: MaterialType; icon: React.ElementType }[] = [
  { label: "Notes", value: "notes", icon: FileText },
  { label: "Question Papers", value: "question_papers", icon: HelpCircle },
  { label: "Videos", value: "videos", icon: Video },
  { label: "Reference", value: "reference", icon: BookOpen },
]

const formatColors: Record<string, string> = {
  PDF: "bg-red-50 text-red-600 border-red-100",
  MP4: "bg-blue-50 text-blue-600 border-blue-100",
  DOC: "bg-indigo-50 text-indigo-600 border-indigo-100",
}

export function StudyMaterials({ initialMaterials = [] }: StudyMaterialsProps) {
  const [activeTab, setActiveTab] = useState<MaterialType>("notes")
  const filtered = initialMaterials.filter((m) => m.type === activeTab)

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#0F1117] font-display">Study Materials</h2>
        <button className="text-sm font-semibold text-[#4F8EF7] hover:text-[#3B7AE0] transition-colors duration-150">
          See All →
        </button>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.value
                ? "bg-[#4F8EF7] text-white shadow-[0_2px_8px_rgba(79,142,247,0.3)]"
                : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#334155]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {filtered.length > 0 ? (
          <div className="space-y-1">
            {filtered.map((material) => (
              <div
                key={material.id}
                className="group flex items-center justify-between rounded-xl p-3 transition-all duration-150 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F3F9]">
                    <FileText className="h-5 w-5 text-[#6B7280]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#0F1117] truncate hover:text-[#4F8EF7] transition-colors">
                      <a href={`/dashboard/study-materials/${material.id}`} className="no-underline text-inherit">
                        {material.title}
                      </a>
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${formatColors[material.format] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                        {material.format}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">• {material.size}</span>
                      <span className="text-[11px] text-[#94A3B8]">• {material.subject}</span>
                      <span className="text-[11px] text-[#94A3B8] hidden sm:inline">• {material.downloads} downloads</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl text-[#94A3B8] hover:text-[#4F8EF7] hover:bg-[#4F8EF7]/5 opacity-60 group-hover:opacity-100 transition-all duration-150"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download {material.title}</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          /* Compact empty state */
          <div className="flex flex-col items-center justify-center py-5 max-h-[100px]">
            <FileText className="h-5 w-5 text-[#CBD5E1]" strokeWidth={1.5} />
            <p className="mt-1.5 text-[13px] text-[#94A3B8]">No {activeTab.replace("_", " ")} available yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
