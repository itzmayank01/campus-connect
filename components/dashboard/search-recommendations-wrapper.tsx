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

  // Don't render anything if there's no active search query
  if (!searchQuery) return null

  return <SearchRecommendations query={searchQuery} />
}
