/**
 * @file quizGenerator.ts
 * @description Generates an 18-question quiz (MCQ + true/false + short answer).
 */

import { Job } from "bullmq";
import { randomUUID } from "crypto";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId, SYSTEM_JSON } from "@/lib/studylab-prompt";

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

  const raw = await callGroq(SYSTEM_JSON, prompt, "llama-3.3-70b-versatile");

  await job.updateProgress({ stage: "Reviewing questions", percent: 80 });

  const parsed = safeParseJson<QuizOutput>(raw);
  // Normalise array response from master prompt
  if (Array.isArray(parsed)) {
    const questionsWithIds = (parsed as any[]).map(q => ({
      ...q,
      id: randomUUID(),
    })) as QuizQuestion[];
    
    return { 
      topic: resource.originalFilename, 
      totalQuestions: questionsWithIds.length, 
      questions: questionsWithIds 
    };
  }
  
  // If somehow it returned an object with a nested questions array
  if (parsed && Array.isArray((parsed as any).questions)) {
    const questionsWithIds = (parsed as any).questions.map((q: any) => ({
      ...q,
      id: randomUUID(),
    })) as QuizQuestion[];

    return { 
      topic: resource.originalFilename, 
      totalQuestions: questionsWithIds.length, 
      questions: questionsWithIds 
    };
  }
  
  return parsed as unknown as QuizOutput;
}
