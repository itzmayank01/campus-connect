"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SearchRecommendations } from "@/components/dashboard/search-recommendations"

export function SearchRecommendationsWrapper() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  useEffect(() => {
    // ONLY trigger from URL params — explicit Smart Feed navigation
    // e.g. /dashboard/smart-feed?q=containerization
    const urlQuery = searchParams.get("q")
    setSearchQuery(urlQuery || null)
    // NO localStorage reads
    // NO event listeners
    // AI recommendations ONLY load when user navigates here with ?q= param
  }, [searchParams])

  // Don't render search recommendations if there's no active search query,
  // but DO render the empty state since we removed the other feeds!
  if (!searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl border border-[#F1F5F9] shadow-sm mt-6 min-h-[400px]">
        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#F59E0B]/10 to-[#F97316]/10 rounded-full mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F59E0B]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h3 className="text-xl font-bold text-[#0F1117] mb-2">Ready to explore?</h3>
        <p className="text-[#64748B] max-w-[300px] text-[15px] leading-relaxed">
          Search for subjects to get personalized recommendations
        </p>
      </div>
    )
  }

  return <SearchRecommendations query={searchQuery} />
}
