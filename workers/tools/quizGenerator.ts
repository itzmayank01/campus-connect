/**
 * @file quizGenerator.ts
 * @description Generates an 18-question quiz (MCQ + true/false + short answer).
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are an expert exam setter for university-level assessments.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

OUTPUT SCHEMA:
{
  "topic": "string",
  "totalQuestions": 18,
  "questions": [
    {
      "id": "string — q01, q02...",
      "type": "mcq" | "true_false" | "short_answer",
      "question": "string",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "string",
      "explanation": "string (max 80 words)",
      "difficulty": "easy" | "medium" | "hard",
      "concept": "string",
      "flashcard_worthy": boolean
    }
  ]
}

QUESTION DISTRIBUTION: 10 MCQ, 5 true/false, 3 short_answer.
DIFFICULTY: 4 easy, 9 medium, 5 hard.

OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

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
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<QuizOutput> {
  await job.updateProgress({ stage: "Writing quiz questions", percent: 40 });

  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Reviewing questions", percent: 80 });
  return safeParseJson<QuizOutput>(raw);
}
