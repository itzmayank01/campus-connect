/**
 * @file AddVideoModal.tsx
 * @description Modal for pasting a YouTube URL to add to the user's StudyLab.
 * Handles: invalid URLs, private videos, missing captions — all gracefully.
 */

"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

interface AddVideoModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddVideoModal({ onClose, onAdded }: AddVideoModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add video");
        return;
      }

      if (data.alreadyExists) {
        setWarning("This video is already in your library.");
        // Still trigger onAdded — the video list will show it
      }

      if (data.transcriptError) {
        setWarning(data.transcriptError);
        // Don't call onAdded yet — let user see the warning
        return;
      }

      onAdded();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0F1117]">
            Add YouTube video
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64748B] mb-3">
          Paste a YouTube lecture, tutorial, or class recording URL. AI tools
          work on videos that have English captions/subtitles.
        </p>

        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 text-[#0F1117] placeholder-[#CBD5E1]"
          autoFocus
        />

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mb-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {warning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">{warning}</p>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={loading || !url.trim()}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? "Fetching video..." : "Add video"}
        </button>
      </div>
    </div>
  );
}
