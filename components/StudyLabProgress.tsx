/**
 * @file StudyLabProgress.tsx
 * @description Live progress view shown while a tool is generating.
 * Subscribes to SSE stream and shows animated progress bar.
 */

"use client";

import { useState, useEffect } from "react";

interface StudyLabProgressProps {
  toolId: string;
}

export function StudyLabProgress({ toolId }: StudyLabProgressProps) {
  const [stage, setStage] = useState("Preparing...");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource(`/api/study-tools/${toolId}/stream`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          source.close();
        } else {
          if (data.stage) setStage(data.stage);
          if (data.percent !== undefined) setPercent(data.percent);
          if (data.percent >= 100) source.close();
        }
      } catch { /* ignore parse errors */ }
    };

    source.onerror = () => source.close();
    return () => source.close();
  }, [toolId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-red-500 text-2xl">✕</span>
        </div>
        <p className="text-sm font-semibold text-[#0F1117] mb-1">Generation failed</p>
        <p className="text-xs text-[#64748B] max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Animated orb */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-20" />
        <div className="absolute inset-2 rounded-full bg-indigo-50 animate-pulse" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse" />
        </div>
      </div>

      <p className="text-sm font-semibold text-[#0F1117] mb-1">{stage}</p>
      <p className="text-xs text-[#94A3B8] mb-6">{percent}% complete</p>

      <div className="w-full max-w-xs h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(percent, 5)}%` }}
        />
      </div>
    </div>
  );
}
