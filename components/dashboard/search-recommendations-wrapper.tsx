"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SearchRecommendations } from "@/components/dashboard/search-recommendations"

export function SearchRecommendationsWrapper() {
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

  return <SearchRecommendations query={searchQuery} />
}
