"use client"

import { FlaskConical, Sparkles } from "lucide-react"
import { StudyLabEntry } from "@/components/StudyLabEntry"

export default function StudyLabPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
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
                Transform any document or YouTube video into interactive study tools.
              </p>
            </div>
          </div>
        </div>
      </div>

      <StudyLabEntry defaultOpen={true} />
    </div>
  )
}
