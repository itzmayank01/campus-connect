/**
 * @file BookmarkButton.tsx
 * @description Toggle-able bookmark button for resources.
 * Uses the existing ResourceBookmark table via dedicated API.
 * Shown on resource cards and detail pages.
 */

"use client";

import { useState, useCallback } from "react";
import { Bookmark } from "lucide-react";

interface BookmarkButtonProps {
  resourceId: string;
  initialBookmarked?: boolean;
  size?: "sm" | "md";
}

export function BookmarkButton({
  resourceId,
  initialBookmarked = false,
  size = "md",
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked); // optimistic update

    try {
      const res = await fetch("/api/resource-bookmark", {
        method: wasBookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId }),
      });

      if (!res.ok) {
        setBookmarked(wasBookmarked); // revert on error
      }
    } catch {
      setBookmarked(wasBookmarked); // revert on error
    } finally {
      setLoading(false);
    }
  }, [bookmarked, resourceId]);

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={loading}
      className={`${padding} rounded-lg transition-all duration-200 ${
        bookmarked
          ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100"
          : "text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9]"
      }`}
      title={bookmarked ? "Remove from StudyLab" : "Save to StudyLab"}
      aria-label={bookmarked ? "Remove from StudyLab" : "Save to StudyLab"}
    >
      <Bookmark
        className={`${iconSize} ${bookmarked ? "fill-yellow-500" : ""}`}
      />
    </button>
  );
}
