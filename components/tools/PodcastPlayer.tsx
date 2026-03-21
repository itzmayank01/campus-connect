/**
 * @file PodcastPlayer.tsx
 * @description Two-voice podcast player. Plays base64 MP3 per dialogue turn
 * sequentially, highlighting the active speaker in the transcript below.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface ScriptTurn {
  speaker:     "A" | "B";
  text:        string;
  audioBase64: string;
}

interface PodcastPlayerProps {
  scriptJson: string;
  speakerA:   string;
  speakerB:   string;
  totalTurns: number;
  // Legacy fields — ignored but kept for backward-compat if any cached tools have them
  audioUrl?:        string;
  durationSeconds?: number;
}

export function PodcastPlayer({ scriptJson, speakerA, speakerB, totalTurns }: PodcastPlayerProps) {
  const turns: ScriptTurn[] = (() => {
    try { return JSON.parse(scriptJson); }
    catch { return []; }
  })();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const audioRef                    = useRef<HTMLAudioElement>(null);
  const transcriptRef               = useRef<HTMLDivElement>(null);

  // Load audio for the current turn
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !turns[currentIdx]?.audioBase64) return;
    audio.src = `data:audio/mpeg;base64,${turns[currentIdx].audioBase64}`;
    if (playing) audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // Auto-scroll transcript to active turn
  useEffect(() => {
    const el = document.getElementById(`turn-${currentIdx}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIdx]);

  const handleEnded = useCallback(() => {
    if (currentIdx < turns.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      // Audio src change triggers useEffect; play will fire from there
    } else {
      setPlaying(false);
    }
  }, [currentIdx, turns.length]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setPlaying(true);
    // useEffect will load src; we trigger play manually after short delay
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
  }, []);

  const prev = () => currentIdx > 0 && goTo(currentIdx - 1);
  const next = () => currentIdx < turns.length - 1 && goTo(currentIdx + 1);

  if (turns.length === 0) {
    return (
      <div className="p-8 text-center text-[#64748B]">
        <p className="text-sm">No podcast data available.</p>
      </div>
    );
  }

  const currentTurn = turns[currentIdx];

  return (
    <div className="p-5 max-w-lg mx-auto">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Player card */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-6 mb-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
            🎧
          </div>
          <div>
            <p className="text-sm font-semibold">AI Podcast</p>
            <p className="text-xs opacity-80">{speakerA} &amp; {speakerB} · {totalTurns} turns</p>
          </div>
        </div>

        {/* Active turn preview */}
        <div className="bg-white/10 rounded-xl px-4 py-3 mb-5 min-h-[60px]">
          <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
            {currentTurn.speaker === "A" ? speakerA : speakerB}
          </p>
          <p className="text-sm leading-relaxed line-clamp-3">{currentTurn.text}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-0.5 mb-4 overflow-hidden">
          {turns.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1 rounded-full flex-1 transition-all ${
                i === currentIdx ? "bg-white" : i < currentIdx ? "bg-white/50" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <p className="text-center text-[10px] opacity-60 mb-3">
          Turn {currentIdx + 1} of {turns.length}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prev}
            disabled={currentIdx === 0}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={toggle}
            className="w-14 h-14 rounded-full bg-white text-indigo-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button
            onClick={next}
            disabled={currentIdx === turns.length - 1}
            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <p className="text-xs font-semibold text-[#0F1117] mb-2">Full Transcript</p>
      <div ref={transcriptRef} className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {turns.map((t, i) => (
          <button
            id={`turn-${i}`}
            key={i}
            onClick={() => goTo(i)}
            className={`flex gap-2 w-full text-left transition-all ${
              t.speaker === "A" ? "" : "flex-row-reverse"
            } ${i === currentIdx ? "opacity-100" : "opacity-60 hover:opacity-80"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                t.speaker === "A"
                  ? "bg-pink-100 text-pink-600"
                  : "bg-blue-100 text-blue-600"
              } ${i === currentIdx ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
            >
              {t.speaker === "A" ? "J" : "A"}
            </div>
            <div
              className={`rounded-xl px-3 py-2 text-xs max-w-[80%] leading-relaxed ${
                t.speaker === "A" ? "bg-pink-50" : "bg-blue-50"
              } text-[#334155] ${i === currentIdx ? "ring-1 ring-indigo-300" : ""}`}
            >
              {t.text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
