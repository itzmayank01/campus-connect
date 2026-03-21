/**
 * @file VideoOverviewPlayer.tsx
 * @description Narrated slide deck — slides with synced per-slide audio.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  index: number; type: string; title: string; subtitle?: string;
  bullets?: string[]; quote?: string; note: string;
}

interface VideoOverviewPlayerProps {
  slides: { title: string; slides: Slide[] };
  narrations: string[];
  audioBase64: string[];
  totalDuration: number;
}

export function VideoOverviewPlayer({ slides, narrations, audioBase64, totalDuration }: VideoOverviewPlayerProps) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sl = slides.slides[idx];

  useEffect(() => {
    if (audioRef.current && audioBase64[idx]) {
      audioRef.current.src = `data:audio/mpeg;base64,${audioBase64[idx]}`;
      if (playing) audioRef.current.play();
    }
  }, [idx, audioBase64, playing]);

  const handleEnded = () => {
    if (idx < slides.slides.length - 1) { setIdx(idx + 1); }
    else setPlaying(false);
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  if (!sl) return null;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <audio ref={audioRef} onEnded={handleEnded} />
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0F1117] truncate">{slides.title}</h3>
        <span className="text-xs text-[#94A3B8]">~{Math.round(totalDuration / 60)} min</span>
      </div>

      {/* Slide display */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-slate-900 to-indigo-950 text-white min-h-[250px] p-6 flex flex-col justify-center mb-4">
        <p className="text-xs text-indigo-300 mb-2">Slide {idx + 1} / {slides.slides.length}</p>
        <h2 className="text-lg font-bold mb-3">{sl.title}</h2>
        {sl.bullets && <ul className="space-y-1.5">{sl.bullets.map((b, i) => <li key={i} className="text-sm text-white/80 flex items-start gap-2"><span className="text-indigo-400 mt-0.5">▸</span>{b}</li>)}</ul>}
        {sl.quote && <p className="text-sm italic text-white/80 text-center mt-2">"{sl.quote}"</p>}
      </div>

      {/* Narration text */}
      {narrations[idx] && (
        <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 mb-4 text-xs text-[#64748B] leading-relaxed">
          🎙️ {narrations[idx]}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setIdx(Math.max(0, idx - 1)); }} disabled={idx === 0} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={toggle} className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button onClick={() => { setIdx(Math.min(slides.slides.length - 1, idx + 1)); }} disabled={idx === slides.slides.length - 1} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
