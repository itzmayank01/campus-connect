/**
 * @file FlashcardViewer.tsx
 * @description Interactive flashcard viewer with flip animation and progress tracking.
 */

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Eye } from "lucide-react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

interface FlashcardViewerProps {
  topic: string;
  cards: Flashcard[];
}

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

export function FlashcardViewer({ topic, cards }: FlashcardViewerProps) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const card = cards[current];
  if (!card) return <div className="p-8 text-center text-[#64748B]">No flashcards available</div>;

  const goPrev = () => { setCurrent((p) => Math.max(0, p - 1)); setFlipped(false); setShowHint(false); };
  const goNext = () => { setCurrent((p) => Math.min(cards.length - 1, p + 1)); setFlipped(false); setShowHint(false); };

  return (
    <div className="p-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117]">{topic}</h3>
        <span className="text-xs text-[#94A3B8]">{current + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#F1F5F9] rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${((current + 1) / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="relative cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white shadow-sm min-h-[240px] flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:shadow-md"
      >
        <span className={`absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[card.difficulty]}`}>
          {card.difficulty}
        </span>

        {!flipped ? (
          <>
            <p className="text-sm text-[#94A3B8] mb-2 uppercase tracking-wider font-medium">Question</p>
            <p className="text-base font-semibold text-[#0F1117] leading-relaxed">{card.front}</p>
            <p className="text-[10px] text-[#CBD5E1] mt-4">Tap to reveal answer</p>
          </>
        ) : (
          <>
            <p className="text-sm text-emerald-600 mb-2 uppercase tracking-wider font-medium">Answer</p>
            <p className="text-base text-[#334155] leading-relaxed">{card.back}</p>
          </>
        )}
      </div>

      {/* Hint */}
      {!flipped && (
        <div className="mt-3 text-center">
          {showHint ? (
            <p className="text-xs text-amber-600 bg-amber-50 inline-block px-3 py-1.5 rounded-lg">💡 {card.hint}</p>
          ) : (
            <button onClick={() => setShowHint(true)} className="text-xs text-[#94A3B8] hover:text-[#64748B] flex items-center gap-1 mx-auto">
              <Eye className="w-3 h-3" /> Show hint
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
        {card.tags.map((tag) => (
          <span key={tag} className="text-[10px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button onClick={goPrev} disabled={current === 0} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => { setCurrent(0); setFlipped(false); setShowHint(false); }} className="text-xs text-[#94A3B8] hover:text-[#64748B] flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Restart
        </button>
        <button onClick={goNext} disabled={current === cards.length - 1} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
