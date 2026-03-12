"use client"

import { useState } from "react"
import { Download, FileText, Video, HelpCircle, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

type MaterialType = "notes" | "question_papers" | "videos" | "reference"

const tabs: { label: string; value: MaterialType; icon: React.ElementType }[] = [
  { label: "Notes", value: "notes", icon: FileText },
  { label: "Question Papers", value: "question_papers", icon: HelpCircle },
  { label: "Videos", value: "videos", icon: Video },
  { label: "Reference", value: "reference", icon: BookOpen },
]

const materials = [
  {
    id: "1",
    title: "Data Structures & Algorithms",
    subject: "DSA",
    type: "notes" as MaterialType,
    format: "PDF",
    size: "3.2 MB",
    semester: 3,
    downloads: 234,
  },
  {
    id: "2",
    title: "Database Management Systems",
    subject: "DBMS",
    type: "notes" as MaterialType,
    format: "PDF",
    size: "2.8 MB",
    semester: 3,
    downloads: 189,
  },
  {
    id: "3",
    title: "Operating Systems - Complete Notes",
    subject: "OS",
    type: "notes" as MaterialType,
    format: "PDF",
    size: "4.1 MB",
    semester: 4,
    downloads: 312,
  },
  {
    id: "4",
    title: "Computer Networks - Unit 1-3",
    subject: "CN",
    type: "notes" as MaterialType,
    format: "PDF",
    size: "2.5 MB",
    semester: 4,
    downloads: 156,
  },
  {
    id: "5",
    title: "DSA Mid-Semester 2024",
    subject: "DSA",
    type: "question_papers" as MaterialType,
    format: "PDF",
    size: "1.2 MB",
    semester: 3,
    downloads: 420,
  },
  {
    id: "6",
    title: "DBMS Final Exam 2024",
    subject: "DBMS",
    type: "question_papers" as MaterialType,
    format: "PDF",
    size: "1.5 MB",
    semester: 3,
    downloads: 380,
  },
  {
    id: "7",
    title: "Binary Tree Traversals - Explained",
    subject: "DSA",
    type: "videos" as MaterialType,
    format: "MP4",
    size: "45 MB",
    semester: 3,
    downloads: 89,
  },
  {
    id: "8",
    title: "CLRS - Introduction to Algorithms",
    subject: "DSA",
    type: "reference" as MaterialType,
    format: "PDF",
    size: "12 MB",
    semester: 3,
    downloads: 67,
  },
]

const formatColors: Record<string, string> = {
  PDF: "bg-red-100 text-red-700",
  MP4: "bg-blue-100 text-blue-700",
  DOC: "bg-indigo-100 text-indigo-700",
}

export function StudyMaterials() {
  const [activeTab, setActiveTab] = useState<MaterialType>("notes")

  const filtered = materials.filter((m) => m.type === activeTab)

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Study Materials</h2>
        <Button variant="link" size="sm" className="text-primary text-sm font-medium p-0 h-auto">
          See All →
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Material List */}
      <div className="space-y-1">
        {filtered.map((material) => (
          <div
            key={material.id}
            className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">{material.title}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${formatColors[material.format] || "bg-gray-100 text-gray-700"}`}>
                    {material.format}
                  </span>
                  <span className="text-[11px] text-muted-foreground">• {material.size}</span>
                  <span className="text-[11px] text-muted-foreground">• Sem {material.semester}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">• {material.downloads} downloads</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-60 group-hover:opacity-100 transition-opacity"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download {material.title}</span>
            </Button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No {activeTab.replace("_", " ")} available yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
