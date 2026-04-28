"use client"

import { useEffect, useRef } from "react"

export function StudyTimer() {
  const isDocumentVisible = useRef(true)

  useEffect(() => {
    // Check document visibility to only track active time
    const handleVisibilityChange = () => {
      isDocumentVisible.current = document.visibilityState === "visible"
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const intervalId = setInterval(() => {
      if (isDocumentVisible.current) {
        // Send a ping to log 1 minute of study time
        fetch("/api/study-time", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ minutes: 1 }),
        }).catch(console.error)
      }
    }, 60000) // 1 minute

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [])

  return null // Invisible tracking component
}
