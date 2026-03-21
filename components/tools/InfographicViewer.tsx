/**
 * @file InfographicViewer.tsx
 * @description Visual infographic renderer — headline stat, stats grid, comparison bars, timeline.
 */

"use client";

import { TrendingUp, TrendingDown, Minus, Users, Clock, Award, Globe, Zap } from "lucide-react";

interface InfographicViewerProps {
  title: string;
  headlineStat: { value: string; label: string; context: string };
  stats: Array<{ value: string; label: string; trend: string; icon: string }>;
  comparison: Array<{ label: string; value: number; color: string }>;
  timeline: Array<{ year: string; event: string }>;
  keyQuote: string;
  keyQuoteSource: string | null;
}

const ICON_MAP: Record<string, typeof TrendingUp> = {
  "trending-up": TrendingUp, users: Users, clock: Clock, award: Award, globe: Globe, zap: Zap,
};

const BAR_COLORS: Record<string, string> = {
  blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", purple: "bg-purple-500",
};

export function InfographicViewer(props: InfographicViewerProps) {
  const { title, headlineStat, stats, comparison, timeline, keyQuote, keyQuoteSource } = props;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-[#0F1117] mb-5 text-center">{title}</h2>

      {/* Headline stat */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 text-center mb-5">
        <p className="text-4xl font-bold mb-1">{headlineStat.value}</p>
        <p className="text-sm opacity-90">{headlineStat.label}</p>
        <p className="text-xs opacity-70 mt-1">{headlineStat.context}</p>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {stats.map((s, i) => {
            const IconComp = ICON_MAP[s.icon] || Zap;
            const TrendIcon = s.trend === "up" ? TrendingUp : s.trend === "down" ? TrendingDown : Minus;
            return (
              <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                  <IconComp className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#0F1117]">{s.value}</p>
                  <p className="text-xs text-[#64748B] flex items-center gap-1">{s.label} <TrendIcon className={`w-3 h-3 ${s.trend === "up" ? "text-emerald-500" : s.trend === "down" ? "text-red-500" : "text-gray-400"}`} /></p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison bars */}
      {comparison.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 mb-5">
          <p className="text-xs font-semibold text-[#0F1117] mb-3">Comparison</p>
          <div className="space-y-3">
            {comparison.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#334155]">{c.label}</span>
                  <span className="text-[#94A3B8]">{c.value}%</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${BAR_COLORS[c.color] || "bg-indigo-500"}`} style={{ width: `${c.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 mb-5">
          <p className="text-xs font-semibold text-[#0F1117] mb-3">Timeline</p>
          <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
            {timeline.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                <p className="text-xs"><span className="font-semibold text-indigo-600">{t.year}</span> — {t.event}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key quote */}
      {keyQuote && (
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-center">
          <p className="text-sm italic text-[#334155] leading-relaxed">"{keyQuote}"</p>
          {keyQuoteSource && <p className="text-xs text-[#94A3B8] mt-2">— {keyQuoteSource}</p>}
        </div>
      )}
    </div>
  );
}
