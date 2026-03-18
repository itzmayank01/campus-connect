"use client"

import { Bookmark, BookOpen } from "lucide-react"
import Link from "next/link"

export default function BookmarksPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5A623]/20 to-[#FCD34D]/20 shadow-sm">
          <Bookmark className="h-6 w-6 text-[#F5A623]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            Bookmarks
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Your saved resources and study materials
          </p>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-12 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEF3C7] mx-auto mb-4">
          <Bookmark className="h-8 w-8 text-[#F5A623]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[#334155]">No bookmarks yet</h3>
        <p className="text-sm text-[#94A3B8] mt-1 max-w-sm mx-auto">
          Save resources by clicking the bookmark icon on any study material. Your saved items will appear here.
        </p>
        <Link
          href="/dashboard/subjects"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all duration-200 no-underline"
        >
          <BookOpen className="h-4 w-4" />
          Browse Subjects
        </Link>
      </div>
    </div>
  )
}
