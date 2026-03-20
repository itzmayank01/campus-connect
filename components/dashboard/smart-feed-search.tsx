"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Sparkles } from "lucide-react"

export function SmartFeedSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const [query, setQuery] = useState(initialQuery)

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = query.trim()
      if (!q) return
      // Update URL — this triggers SearchRecommendationsWrapper via ?q= param
      router.push(`/dashboard/smart-feed?q=${encodeURIComponent(q)}`)
    },
    [query, router]
  )

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="flex items-center gap-3 rounded-2xl bg-white border border-[#E2E8F0] p-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus-within:border-[#4F8EF7] focus-within:shadow-[0_0_0_3px_rgba(79,142,247,0.12)] transition-all duration-200">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F59E0B]/10 to-[#F97316]/10">
          <Sparkles className="h-5 w-5 text-[#F59E0B]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Campus AI — e.g. 'containerization and devops', 'compiler design notes'..."
          className="flex-1 bg-transparent text-sm text-[#0F1117] placeholder-[#94A3B8] outline-none font-medium"
          id="smart-feed-search"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="flex items-center gap-2 rounded-xl bg-[#4F8EF7] text-white font-semibold px-5 py-2.5 text-sm shadow-md shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
      <p className="text-[11px] text-[#94A3B8] mt-2 ml-1">
        Search for any subject or topic to get AI-powered resource recommendations and study tips
      </p>
    </form>
  )
}
