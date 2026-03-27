/**
 * @file flashcardGenerator.ts
 * @description Generates 20 study flashcards from document text.
 * Output JSON consumed by the FlashcardViewer component.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId, SYSTEM_JSON } from "@/lib/studylab-prompt";

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
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<FlashcardsOutput> {
  await job.updateProgress({ stage: "Creating flashcards", percent: 40 });

  const prompt = buildPrompt({
    toolType:        "FLASHCARDS",
    documentContent: text,
    documentId:      getDocumentId(text),
    isRefresh,
  });

  const raw = await callGroq(SYSTEM_JSON, prompt, "llama-3.3-70b-versatile");

  await job.updateProgress({ stage: "Finalising cards", percent: 80 });

  const parsed = safeParseJson<FlashcardsOutput>(raw);

  // Normalise: master prompt returns array-style, old prompt returns object-style
  if (Array.isArray(parsed)) {
    return { topic: resource.originalFilename, cards: parsed as unknown as Flashcard[] };
  }
  if (!parsed.cards || parsed.cards.length === 0) {
    throw new Error("No flashcards returned");
  }
  return parsed;
}
