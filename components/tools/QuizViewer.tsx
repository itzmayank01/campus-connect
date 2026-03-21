/**
 * @file QuizViewer.tsx
 * @description Interactive quiz with score tracking and explanations.
 */

"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correct: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  concept: string;
}

interface QuizViewerProps {
  topic: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

export function QuizViewer({ topic, questions }: QuizViewerProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showScore, setShowScore] = useState(false);

  const q = questions[current];
  const totalQ = questions.length;
  const userAnswer = answers[q?.id];
  const isRevealed = revealed.has(q?.id);

  const handleSelect = (answer: string) => {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
  };

  const handleReveal = () => {
    setRevealed((prev) => new Set(prev).add(q.id));
  };

  const handleNext = () => {
    if (current < totalQ - 1) {
      setCurrent(current + 1);
    } else {
      setShowScore(true);
    }
  };

  const score = questions.filter((qq) => {
    const ans = answers[qq.id];
    if (!ans) return false;
    if (qq.type === "mcq") return ans.charAt(0) === qq.correct.charAt(0);
    if (qq.type === "true_false") return ans.toLowerCase() === qq.correct.toLowerCase();
    return false; // short_answer — manual check
  }).length;

  if (showScore) {
    const pct = Math.round((score / totalQ) * 100);
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold ${pct >= 70 ? "bg-emerald-50 text-emerald-600" : pct >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{pct}%</div>
        <h3 className="text-lg font-semibold text-[#0F1117] mb-1">{pct >= 70 ? "Great job! 🎉" : pct >= 40 ? "Keep practicing! 💪" : "Review the material 📖"}</h3>
        <p className="text-sm text-[#64748B]">{score} / {totalQ} correct on {topic}</p>
        <button onClick={() => { setCurrent(0); setAnswers({}); setRevealed(new Set()); setShowScore(false); }} className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">Retake Quiz</button>
      </div>
    );
  }

  if (!q) return null;

  const isCorrect = () => {
    if (q.type === "mcq") return userAnswer?.charAt(0) === q.correct.charAt(0);
    if (q.type === "true_false") return userAnswer?.toLowerCase() === q.correct.toLowerCase();
    return false;
  };

  return (
    <div className="p-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#94A3B8]">{current + 1} / {totalQ}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${q.difficulty === "easy" ? "bg-emerald-50 text-emerald-700" : q.difficulty === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{q.difficulty}</span>
      </div>

      <div className="h-1 bg-[#F1F5F9] rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${((current + 1) / totalQ) * 100}%` }} />
      </div>

      <p className="text-sm font-semibold text-[#0F1117] mb-4 leading-relaxed">{q.question}</p>

      {/* MCQ */}
      {q.type === "mcq" && q.options && (
        <div className="space-y-2">
          {q.options.map((opt) => {
            const letter = opt.charAt(0);
            const isSelected = userAnswer?.charAt(0) === letter;
            const correctLetter = q.correct.charAt(0);
            let classes = "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]";
            if (isRevealed) {
              if (letter === correctLetter) classes = "border-emerald-300 bg-emerald-50";
              else if (isSelected) classes = "border-red-300 bg-red-50";
            } else if (isSelected) {
              classes = "border-indigo-300 bg-indigo-50";
            }
            return (
              <button key={letter} onClick={() => handleSelect(letter)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${classes}`}>
                {isRevealed && letter === correctLetter && <CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-2" />}
                {isRevealed && isSelected && letter !== correctLetter && <XCircle className="w-4 h-4 text-red-400 inline mr-2" />}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* True/False */}
      {q.type === "true_false" && (
        <div className="flex gap-3">
          {["True", "False"].map((opt) => {
            const isSelected = userAnswer === opt;
            let classes = "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]";
            if (isRevealed) {
              if (opt === q.correct) classes = "border-emerald-300 bg-emerald-50";
              else if (isSelected) classes = "border-red-300 bg-red-50";
            } else if (isSelected) classes = "border-indigo-300 bg-indigo-50";
            return (
              <button key={opt} onClick={() => handleSelect(opt)} className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${classes}`}>{opt}</button>
            );
          })}
        </div>
      )}

      {/* Short answer */}
      {q.type === "short_answer" && (
        <div>
          <textarea value={userAnswer || ""} onChange={(e) => handleSelect(e.target.value)} className="w-full border border-[#E2E8F0] rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Type your answer..." />
          {isRevealed && <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl"><span className="font-semibold">Model answer:</span> {q.correct}</p>}
        </div>
      )}

      {/* Explanation */}
      {isRevealed && (
        <div className={`mt-3 p-3 rounded-xl text-xs ${isCorrect() ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {isCorrect() ? "✓ Correct! " : "✗ Incorrect. "}{q.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-5">
        {!isRevealed && userAnswer && (
          <button onClick={handleReveal} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">Check Answer</button>
        )}
        {isRevealed && (
          <button onClick={handleNext} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1">
            {current < totalQ - 1 ? "Next" : "See Score"} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
