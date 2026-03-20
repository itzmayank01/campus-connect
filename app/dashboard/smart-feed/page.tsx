"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ForYouFeed } from "@/components/dashboard/for-you-feed"
import { TrendingResources } from "@/components/dashboard/trending-resources"
import { SearchRecommendations } from "@/components/dashboard/search-recommendations"
import { Sparkles } from "lucide-react"

export default function SmartFeedPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  useEffect(() => {
    // Check URL params first
    const urlQuery = searchParams.get("q")
    if (urlQuery) {
      setSearchQuery(urlQuery)
      return
    }

    // Check localStorage for search signal from search dialog
    const stored = typeof window !== "undefined" ? localStorage.getItem("lastSearchQuery") : null
    if (stored) setSearchQuery(stored)

    // Listen for new search events
    const handleSearchTracked = () => {
      const q = localStorage.getItem("lastSearchQuery")
      if (q) setSearchQuery(q)
    }
    window.addEventListener("searchTracked", handleSearchTracked)
    return () => window.removeEventListener("searchTracked", handleSearchTracked)
  }, [searchParams])

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#F97316]/20 shadow-sm">
          <Sparkles className="h-5 w-5 text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0F1117] font-display">
            Smart Feed
          </h1>
          <p className="text-sm text-[#6B7280]">
            AI-powered recommendations based on your activity
          </p>
        </div>
        <span className="ml-auto rounded-full bg-gradient-to-r from-[#F59E0B]/15 to-[#F97316]/15 px-3 py-1 text-xs font-bold text-[#F59E0B] tracking-wide">
          AI POWERED
        </span>
      </div>

      {/* Search Recommendations (shown when repeat search detected) */}
      <SearchRecommendations query={searchQuery} />

      {/* Main content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px] items-start">
        {/* Left: For You Feed */}
        <div className="space-y-5">
          <ForYouFeed />
        </div>

        {/* Right: Trending */}
        <div className="space-y-5">
          <TrendingResources />
        </div>
      </div>
    </div>
  )
}
