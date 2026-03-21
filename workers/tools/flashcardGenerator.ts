/**
 * @file flashcardGenerator.ts
 * @description Generates 20 study flashcards from document text.
 * Output JSON consumed by the FlashcardViewer component.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are an expert exam tutor who creates high-quality flashcards.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

OUTPUT SCHEMA:
{
  "topic": "string — the document's main topic",
  "cards": [
    {
      "id": "string — sequential: card_01, card_02...",
      "front": "string — the question (max 25 words)",
      "back": "string — the answer (max 70 words)",
      "hint": "string — a one-phrase hint (max 8 words)",
      "difficulty": "easy" | "medium" | "hard",
      "type": "definition" | "application" | "comparison" | "cause_effect" | "process",
      "tags": ["string array of 1-3 concept tags"]
    }
  ]
}

CARD QUALITY RULES:
- Generate exactly 20 cards
- Distribution: 5 easy, 10 medium, 5 hard
- Front (question) must be specific
- Back (answer) must be complete but not overwhelming
- Never create trivial "what is X" cards

OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
  type: "definition" | "application" | "comparison" | "cause_effect" | "process";
  tags: string[];
}

export interface FlashcardsOutput {
  topic: string;
  cards: Flashcard[];
}

/**
 * Generates 20 flashcards from document text.
 */
export async function generateFlashcards(
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<FlashcardsOutput> {
  await job.updateProgress({ stage: "Creating flashcards", percent: 40 });

  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Finalising cards", percent: 80 });

  const parsed = safeParseJson<FlashcardsOutput>(raw);
  if (!parsed.cards || parsed.cards.length === 0) {
    throw new Error("Groq returned zero flashcards");
  }

  return parsed;
}
