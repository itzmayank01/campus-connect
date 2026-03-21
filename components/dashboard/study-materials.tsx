"use client"

import { useState, useEffect } from "react"
import { Download, FileText, Video, HelpCircle, BookOpen, Search, ArrowRight, Play, FileArchive, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type MaterialType = "notes" | "question_papers" | "videos" | "reference" | "syllabus" | "all"

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
  { label: "Syllabus", value: "syllabus", icon: BookOpen },
  { label: "Reference", value: "reference", icon: BookOpen },
]

const formatColors: Record<string, string> = {
  PDF: "bg-red-50 text-red-600 border-red-100",
  MP4: "bg-blue-50 text-blue-600 border-blue-100",
  DOC: "bg-indigo-50 text-indigo-600 border-indigo-100",
}

export function StudyMaterials({ initialMaterials = [] }: StudyMaterialsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<MaterialType>("notes")
  const [recommendation, setRecommendation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [targetQuery, setTargetQuery] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecs() {
      try {
        setLoading(true)
        const typeQuery = activeTab === 'all' ? '' : `&type=${activeTab}`
        const searchTarget = targetQuery ? `&query=${encodeURIComponent(targetQuery)}` : ''
        const url = `/api/dashboard/recommendations?${typeQuery}${searchTarget}`
        
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setRecommendation(data)
        }
      } catch (e) {
        console.error("Failed to load recommendations", e)
      } finally {
        setLoading(false)
      }
    }
    fetchRecs()
  }, [activeTab, targetQuery])

  const filtered = initialMaterials.filter((m) => m.type === activeTab)

  const getIconConfig = (type: string, mime: string) => {
    if (type.toLowerCase() === 'videos' || mime === 'youtube') return { bg: 'bg-[#EDE9FE]', icon: Play, text: 'text-purple-500' }
    if (mime?.includes('zip') || mime?.includes('archive')) return { bg: 'bg-[#FEF9C3]', icon: FileArchive, text: 'text-yellow-600' }
    if (type.toLowerCase() === 'notes') return { bg: 'bg-[#DBEAFE]', icon: FileText, text: 'text-blue-500' }
    if (mime?.includes('pdf') || type.toLowerCase() === 'question_papers') return { bg: 'bg-[#FEE2E2]', icon: File, text: 'text-red-500' }
    return { bg: 'bg-[#F1F5F9]', icon: File, text: 'text-slate-500' }
  }

  const isRecMode = recommendation?.has_recommendation

  return (
    <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#0F1117] font-display">Study Materials</h2>
          {isRecMode && (
            <span className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[10px] rounded-full px-2 py-0.5 font-bold tracking-wide">
              ✨ Personalized
            </span>
          )}
        </div>
        <button 
          onClick={() => router.push('/dashboard/study-materials')}
          className="text-sm font-semibold text-[#4F8EF7] hover:text-[#3B7AE0] transition-colors duration-150"
        >
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
      <div className="min-h-[200px] relative">
        {/* Recommendation Mode */}
        {isRecMode && !loading && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Trigger Card */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] border-l-4 border-l-[#3B82F6] rounded-[10px] p-[12px_16px] mb-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
                  <Search className="w-3.5 h-3.5" /> Based on your searches
                </div>
                <div className="text-[13px] font-semibold text-[#1E40AF]">
                  You searched "{recommendation.trigger.query}" {recommendation.trigger.count} times recently
                </div>
                <div className="text-[11px] text-[#94A3B8] italic">Showing top resources →</div>
              </div>
            </div>

            {/* Resources List */}
            {recommendation.resources?.length > 0 ? (
              <div className="flex flex-col">
                {recommendation.resources.map((res: any) => {
                  const IconMeta = getIconConfig(res.resourceType, res.mimeType)
                  const RIcon = IconMeta.icon
                  return (
                    <div
                      key={res.id}
                      onClick={() => router.push(`/dashboard/subjects/${res.subjectId}?highlight=${res.id}`)}
                      className="group flex items-center gap-3 py-3 border-b border-[#F8FAFC] last:border-0 cursor-pointer hover:bg-[#F0F7FF] hover:px-2 rounded-lg transition-all duration-150"
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${IconMeta.bg} shrink-0`}>
                        <RIcon className={`w-4 h-4 ${IconMeta.text}`} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="text-[14px] font-semibold text-[#1E293B] truncate">
                          {res.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                          <span className="bg-[#F1F5F9] text-[#475569] font-bold px-1.5 py-[1px] rounded-[4px] text-[10px]">
                            {res.subjectCode}
                          </span>
                          <span>•</span>
                          <span>{res.resourceType.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>↓ {res.downloadCount}</span>
                        </div>
                      </div>
                      <div className="text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-[13px] text-[#94A3B8]">
                No matching {activeTab.replace('_', ' ')} found for this search.
              </div>
            )}

            {/* Other Searches Switcher */}
            {recommendation.other_triggers && recommendation.other_triggers.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F8FAFC] pt-3">
                <span className="text-[11px] text-[#64748B]">Also searched:</span>
                {recommendation.other_triggers.map((t: any) => (
                  <button 
                    key={t.query} 
                    onClick={() => setTargetQuery(t.query)}
                    className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#64748B] text-[11px] rounded-full px-2.5 py-1 transition-colors"
                  >
                    {t.query}
                  </button>
                ))}
              </div>
            )}

            {/* See All Footer */}
            {recommendation.subject && (
              <div 
                className="mt-4 text-center py-2 text-[13px] text-[#3B82F6] cursor-pointer hover:underline font-medium"
                onClick={() => router.push(`/dashboard/subjects/${recommendation.subject.id}`)}
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
            <div className="flex flex-col items-center justify-center py-5 max-h-[100px] animate-in fade-in">
              <FileText className="h-5 w-5 text-[#CBD5E1]" strokeWidth={1.5} />
              <p className="mt-1.5 text-[13px] text-[#94A3B8]">No {activeTab.replace("_", " ")} available yet</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
