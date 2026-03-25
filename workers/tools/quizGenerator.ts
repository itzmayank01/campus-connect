/**
 * @file quizGenerator.ts
 * @description Generates an 18-question quiz (MCQ + true/false + short answer).
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";

export interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correct: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  concept: string;
  flashcard_worthy: boolean;
}

export interface QuizOutput {
  topic: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

/**
 * Generates an 18-question quiz from document text.
 */
export async function generateQuiz(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<QuizOutput> {
  await job.updateProgress({ stage: "Writing quiz questions", percent: 40 });

  const prompt = buildPrompt({
    toolType:        "QUIZ",
    documentContent: text,
    documentId:      getDocumentId(text),
    isRefresh,
  });

  const raw = await callGroq("Return ONLY valid JSON. No explanation, no markdown.", prompt, "llama-3.1-8b-instant");

  await job.updateProgress({ stage: "Reviewing questions", percent: 80 });

  const parsed = safeParseJson<QuizOutput>(raw);
  // Normalise array response from master prompt
  if (Array.isArray(parsed)) {
    return { topic: resource.originalFilename, totalQuestions: parsed.length, questions: parsed as unknown as QuizQuestion[] };
  }
  return parsed;
}
