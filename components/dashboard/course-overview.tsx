"use client"

import { useState, useEffect } from "react"
import { ClipboardList, ChevronDown, ChevronUp, Plus, Target } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Unit {
  unit_number: number
  unit_name: string
  topics: string[]
  importance: "high" | "medium" | "low"
  exam_weightage: string
}

interface TopicsData {
  has_syllabus: boolean
  units: Unit[]
  total_units: number
  most_important_overall: string[]
  course_objectives: string[]
  error?: string
}

interface CourseOverviewProps {
  subjectId: string
  subjectName: string
}

const importanceColors = {
  high: "bg-[#EF4444]",
  medium: "bg-[#F59E0B]",
  low: "bg-[#10B981]",
}

export function CourseOverview({ subjectId, subjectName }: CourseOverviewProps) {
  const [data, setData] = useState<TopicsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  const fetchTopics = async (force = false) => {
    setLoading(true)
    try {
      const url = force ? `/api/subjects/${subjectId}/topics?refresh=true` : `/api/subjects/${subjectId}/topics`
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Fetch topics error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [subjectId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#F1F5F9] bg-white p-6 space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
          <div className="h-5 w-32 bg-[#F1F5F9] animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-6 w-20 bg-[#F1F5F9] animate-pulse rounded-full" />)}
        </div>
        <div className="space-y-2">
           <div className="h-4 w-full bg-[#F1F5F9] animate-pulse rounded" />
           <div className="h-4 w-5/6 bg-[#F1F5F9] animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (data && !data.has_syllabus) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center mb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
            <ClipboardList className="h-6 w-6 text-[#94A3B8]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-[#475569]">📋 No Syllabus Available</h4>
            <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
              Upload the course syllabus or course plan to see AI-extracted important topics and unit-wise breakdown.
            </p>
          </div>
          <Link 
            href={`/dashboard/upload/new?subjectId=${subjectId}&type=SYLLABUS`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:bg-[#2563EB] transition-all no-underline"
          >
           <Plus className="h-4 w-4" />
           Upload Syllabus
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden mb-6 shadow-sm font-sans">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all border-b border-[#F1F5F9]">
        <div className="flex flex-col gap-0.5" onClick={() => setExpanded(!expanded)}>
           <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
              <h3 className="text-base font-bold text-[#1E293B]">📋 Course Overview</h3>
              <span className="rounded-full bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 text-[9px] font-bold tracking-wider">
                AI POWERED
              </span>
           </div>
           <p className="text-[11px] text-[#64748B] ml-7">Extracted from course syllabus</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && data && data.has_syllabus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchTopics(true);
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
              Refresh
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded)
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="h-5 w-5 text-[#94A3B8]" /> : <ChevronDown className="h-5 w-5 text-[#94A3B8]" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-6">
        {/* Most Important Topics Pills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#475569]">
            <Target className="h-4 w-4 text-[#EF4444]" />
            🎯 Most Important Topics
          </div>
          {data?.error ? (
             <div className="text-[13px] text-red-500 italic px-2">{data.error}</div>
          ) : (
             <div className="flex flex-wrap gap-2">
               {data?.most_important_overall?.map((topic: string, iIndex: number) => (
                 <span key={iIndex} className="rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] px-3.5 py-1.5 text-xs font-medium shadow-sm">
                   {topic}
                 </span>
               ))}
             </div>
          )}
        </div>

        <AnimatePresence>
          {expanded && data?.units && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-6 overflow-hidden pt-2"
            >
              {data?.units?.map((unit: Unit, uIndex: number) => (
                <div key={uIndex} className="border-b border-[#F8FAFC] pb-5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                       <h5 className="text-[14px] font-bold text-[#1E293B]">
                         UNIT {unit.unit_number} — {unit.unit_name}
                       </h5>
                       <div 
                         className={`h-2 w-2 rounded-full ${importanceColors[unit.importance as keyof typeof importanceColors] || 'bg-gray-300'}`} 
                         title={`${unit.importance} importance`}
                       />
                    </div>
                    {unit.exam_weightage && (
                      <span className="text-[11px] font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {unit.exam_weightage} Wt.
                      </span>
                    )}
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 ml-4">
                    {unit.topics?.map((topic: string, tIndex: number) => (
                      <li key={tIndex} className="text-sm text-[#64748B] flex items-start gap-2 leading-relaxed">
                        <span className="text-[#CBD5E1] mt-1.5">•</span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

               {data?.units && data?.units.length > 0 && (
                  <div className="pt-2">
                     <p className="text-[10px] text-[#94A3B8] italic text-center flex items-center justify-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" /> High Probability
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] ml-2" /> Medium
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] ml-2" /> Low
                     </p>
                  </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
