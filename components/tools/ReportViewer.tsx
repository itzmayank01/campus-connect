/**
 * @file ReportViewer.tsx
 * @description Renders study report with sections, key concepts, and facts.
 */

"use client";

interface ReportViewerProps {
  title: string;
  subject: string;
  summary: { overview: string; keyArguments: string; significance: string };
  keyConcepts: Array<{ term: string; definition: string; importance: string; relatedTerms: string[] }>;
  keyFacts: Array<{ fact: string; context: string }>;
  timeline?: Array<{ date: string; event: string }>;
  studyQuestions: string[];
  commonMistakes: string[];
  furtherReading: string[];
}

export function ReportViewer(props: ReportViewerProps) {
  const { title, subject, summary, keyConcepts, keyFacts, timeline, studyQuestions, commonMistakes, furtherReading } = props;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[#0F1117] mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#0F1117]">{title}</h2>
        <p className="text-xs text-[#94A3B8] mt-0.5">{subject}</p>
      </div>

      <Section title="Summary">
        <div className="space-y-2 text-sm text-[#334155]">
          <p><span className="font-medium text-[#0F1117]">Overview:</span> {summary.overview}</p>
          <p><span className="font-medium text-[#0F1117]">Key Arguments:</span> {summary.keyArguments}</p>
          <p><span className="font-medium text-[#0F1117]">Significance:</span> {summary.significance}</p>
        </div>
      </Section>

      <Section title="Key Concepts">
        <div className="space-y-3">
          {keyConcepts.map((c, i) => (
            <div key={i} className="rounded-xl border border-[#F1F5F9] bg-white p-3">
              <p className="text-sm font-semibold text-indigo-600">{c.term}</p>
              <p className="text-xs text-[#334155] mt-1">{c.definition}</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">Why it matters: {c.importance}</p>
              {c.relatedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.relatedTerms.map((t) => <span key={t} className="text-[10px] bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 rounded">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Key Facts">
        <div className="space-y-2">
          {keyFacts.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5">•</span>
              <div><p className="text-[#0F1117] font-medium">{f.fact}</p><p className="text-xs text-[#94A3B8]">{f.context}</p></div>
            </div>
          ))}
        </div>
      </Section>

      {timeline && timeline.length > 0 && (
        <Section title="Timeline">
          <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
            {timeline.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                <p className="text-xs font-semibold text-indigo-600">{t.date}</p>
                <p className="text-xs text-[#334155]">{t.event}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Study Questions">
        <ol className="space-y-1.5 list-decimal list-inside text-sm text-[#334155]">
          {studyQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ol>
      </Section>

      <Section title="Common Mistakes">
        <ul className="space-y-1.5 text-sm text-red-700">
          {commonMistakes.map((m, i) => <li key={i} className="flex items-start gap-2"><span>⚠️</span>{m}</li>)}
        </ul>
      </Section>

      <Section title="Further Reading">
        <ul className="space-y-1 text-sm text-[#4F8EF7]">
          {furtherReading.map((r, i) => <li key={i}>→ {r}</li>)}
        </ul>
      </Section>
    </div>
  );
}
