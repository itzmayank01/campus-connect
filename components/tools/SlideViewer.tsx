/**
 * @file SlideViewer.tsx
 * @description Presentation slide viewer with navigation, types, and speaker notes.
 */

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Columns2, BarChart3 } from "lucide-react";

interface Slide {
  index: number;
  type: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  quote?: string;
  quoteSource?: string;
  col1?: { heading: string; bullets: string[] };
  col2?: { heading: string; bullets: string[] };
  stat?: { value: string; label: string; context: string };
  note: string;
}

interface SlideViewerProps {
  title: string;
  subtitle: string;
  slides: Slide[];
}

export function SlideViewer({ title, slides }: SlideViewerProps) {
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const slide = slides[current];
  if (!slide) return null;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117] truncate">{title}</h3>
        <span className="text-xs text-[#94A3B8]">Slide {current + 1} / {slides.length}</span>
      </div>

      {/* Slide card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-white to-[#F8FAFC] min-h-[300px] p-6 flex flex-col justify-center">
        {/* Title slide */}
        {slide.type === "title" && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#0F1117] mb-2">{slide.title}</h2>
            {slide.subtitle && <p className="text-sm text-[#64748B]">{slide.subtitle}</p>}
          </div>
        )}

        {/* Content slide */}
        {(slide.type === "content" || slide.type === "summary") && (
          <div>
            <h3 className="text-lg font-semibold text-[#0F1117] mb-3">{slide.title}</h3>
            {slide.bullets && (
              <ul className="space-y-2">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#334155]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quote slide */}
        {slide.type === "quote" && (
          <div className="text-center">
            <Quote className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
            <blockquote className="text-base italic text-[#334155] max-w-md mx-auto leading-relaxed">"{slide.quote}"</blockquote>
            {slide.quoteSource && <p className="text-xs text-[#94A3B8] mt-3">— {slide.quoteSource}</p>}
          </div>
        )}

        {/* Two-column slide */}
        {slide.type === "two-column" && (
          <div>
            <h3 className="text-lg font-semibold text-[#0F1117] mb-4 flex items-center gap-2"><Columns2 className="w-4 h-4 text-indigo-500" />{slide.title}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[slide.col1, slide.col2].map((col, ci) => col && (
                <div key={ci} className="bg-white rounded-xl border border-[#F1F5F9] p-3">
                  <p className="text-xs font-semibold text-indigo-600 mb-2">{col.heading}</p>
                  <ul className="space-y-1">{col.bullets.map((b, i) => <li key={i} className="text-xs text-[#334155]">• {b}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual-stat slide */}
        {slide.type === "visual-stat" && slide.stat && (
          <div className="text-center">
            <BarChart3 className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-4xl font-bold text-indigo-600 mb-1">{slide.stat.value}</p>
            <p className="text-sm font-medium text-[#0F1117]">{slide.stat.label}</p>
            <p className="text-xs text-[#64748B] mt-1">{slide.stat.context}</p>
          </div>
        )}
      </div>

      {/* Speaker notes toggle */}
      <button onClick={() => setShowNotes(!showNotes)} className="mt-3 text-xs text-[#94A3B8] hover:text-[#64748B]">
        {showNotes ? "Hide" : "Show"} speaker notes
      </button>
      {showNotes && <p className="mt-1 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3 leading-relaxed">{slide.note}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-indigo-500 w-4" : "bg-[#E2E8F0]"}`} />
          ))}
        </div>
        <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1} className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
