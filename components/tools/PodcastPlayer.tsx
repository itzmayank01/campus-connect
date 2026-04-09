/**
 * @file PodcastPlayer.tsx
 * @description Two-voice podcast player with side-by-side layout.
 * LEFT: AI Podcast player card with controls.
 * RIGHT: Full scrollable transcript with active turn highlighting.
 *
 * Plays base64 MP3 per dialogue turn sequentially.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic } from "lucide-react";

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
  // Legacy fields — ignored but kept for backward-compat
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
  const [speed, setSpeed]           = useState(1);
  const audioRef                    = useRef<HTMLAudioElement>(null);
  const transcriptRef               = useRef<HTMLDivElement>(null);

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  // Load audio for the current turn
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !turns[currentIdx]?.audioBase64) return;
    audio.src = `data:audio/mpeg;base64,${turns[currentIdx].audioBase64}`;
    audio.playbackRate = speed;
    if (playing) audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // Auto-scroll transcript to active turn
  useEffect(() => {
    const el = document.getElementById(`turn-${currentIdx}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIdx]);

  const handleEnded = useCallback(() => {
    if (currentIdx < turns.length - 1) {
      setCurrentIdx(currentIdx + 1);
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
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
  }, []);

  const playAll = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !turns[0]?.audioBase64) return;
    audio.src = `data:audio/mpeg;base64,${turns[0].audioBase64}`;
    audio.playbackRate = speed;
    setCurrentIdx(0);
    setPlaying(true);
    setTimeout(() => audio.play().catch(() => {}), 50);
  }, [turns, speed]);

  const changeSpeed = useCallback((s: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = s;
    setSpeed(s);
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
    <div className="flex flex-col lg:flex-row gap-6 p-5 h-full">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={(e) => {
          console.error("Audio playback error on turn", currentIdx, e);
          handleEnded(); // Skip to next turn on error instead of stalling
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* ─── LEFT: Player Card ──────────────────────────────────── */}
      <div className="lg:w-[420px] shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-6 sticky top-5">
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

          {/* Speaker badges */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              currentTurn.speaker === "A" ? "bg-white/25 ring-1 ring-white/50" : "bg-white/10"
            }`}>
              <div className="w-5 h-5 rounded-full bg-pink-400 flex items-center justify-center text-[9px] font-bold text-white">J</div>
              <span className="text-xs font-medium">{speakerA}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              currentTurn.speaker === "B" ? "bg-white/25 ring-1 ring-white/50" : "bg-white/10"
            }`}>
              <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-[9px] font-bold text-white">A</div>
              <span className="text-xs font-medium">{speakerB}</span>
            </div>
          </div>

          {/* Active turn preview */}
          <div className="bg-white/10 rounded-xl px-4 py-3 mb-5 min-h-[80px] backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Volume2 className="w-3 h-3 opacity-60" />
              <p className="text-[10px] uppercase tracking-wider opacity-70">
                {currentTurn.speaker === "A" ? speakerA : speakerB} speaking
              </p>
            </div>
            <p className="text-sm leading-relaxed">{currentTurn.text}</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-0.5 mb-3 overflow-hidden">
            {turns.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full flex-1 transition-all duration-200 ${
                  i === currentIdx
                    ? "bg-white scale-y-125"
                    : i < currentIdx
                    ? "bg-white/50"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>

          <p className="text-center text-[10px] opacity-60 mb-4">
            Turn {currentIdx + 1} of {turns.length}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-5">
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

          {/* Speed selector */}
          <div className="flex items-center justify-center gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                  speed === s
                    ? "bg-white/25 font-semibold"
                    : "bg-white/5 opacity-70 hover:opacity-100 hover:bg-white/10"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Play All button */}
          <button
            onClick={playAll}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all font-semibold text-sm tracking-wide shadow-inner"
          >
            <ListMusic className="w-4 h-4" />
            Play All from Start
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Full Transcript ─────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white z-10 py-2">
          <h3 className="text-sm font-semibold text-[#0F1117]">Full Transcript</h3>
          <span className="text-[10px] text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
            {turns.length} turns
          </span>
        </div>

        <div
          ref={transcriptRef}
          className="space-y-3 overflow-y-auto pr-2"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          {turns.map((t, i) => (
            <button
              id={`turn-${i}`}
              key={i}
              onClick={() => goTo(i)}
              className={`flex gap-3 w-full text-left transition-all duration-200 rounded-xl p-2 -ml-2 ${
                i === currentIdx
                  ? "bg-indigo-50/70 opacity-100"
                  : "opacity-50 hover:opacity-75 hover:bg-gray-50"
              }`}
            >
              {/* Speaker avatar */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    t.speaker === "A"
                      ? "bg-pink-100 text-pink-600"
                      : "bg-blue-100 text-blue-600"
                  } ${i === currentIdx ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                >
                  {t.speaker === "A" ? "J" : "A"}
                </div>
                {i === currentIdx && playing && (
                  <div className="flex items-end gap-[2px] h-3">
                    <div className="w-[3px] bg-indigo-400 rounded-full animate-pulse" style={{ height: "8px", animationDelay: "0ms" }} />
                    <div className="w-[3px] bg-indigo-400 rounded-full animate-pulse" style={{ height: "12px", animationDelay: "150ms" }} />
                    <div className="w-[3px] bg-indigo-400 rounded-full animate-pulse" style={{ height: "6px", animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              {/* Message bubble */}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-semibold mb-0.5 ${
                  t.speaker === "A" ? "text-pink-500" : "text-blue-500"
                }`}>
                  {t.speaker === "A" ? speakerA : speakerB}
                  {i === currentIdx && (
                    <span className="ml-1.5 text-indigo-400 font-normal">● now playing</span>
                  )}
                </p>
                <p className={`text-[13px] leading-relaxed text-[#334155] ${
                  i === currentIdx ? "font-medium" : ""
                }`}>
                  {t.text}
                </p>
              </div>

              {/* Turn number */}
              <span className="text-[9px] text-[#CBD5E1] shrink-0 pt-1 tabular-nums">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
