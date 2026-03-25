/**
 * @file slideGenerator.ts
 * @description Generates a 10-slide presentation JSON with speaker notes.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";

export interface SlideCol { heading: string; bullets: string[] }
export interface SlideStat { value: string; label: string; context: string }
export interface Slide {
  index: number;
  type: "title" | "content" | "quote" | "two-column" | "visual-stat" | "summary";
  title: string;
  subtitle?: string;
  bullets?: string[];
  quote?: string;
  quoteSource?: string;
  col1?: SlideCol;
  col2?: SlideCol;
  stat?: SlideStat;
  note: string;
}

export interface SlideDeckOutput {
  title: string;
  subtitle: string;
  totalSlides: number;
  slides: Slide[];
}

/**
 * Generates a 10-slide presentation from document text.
 */
export async function generateSlides(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<SlideDeckOutput> {
  await job.updateProgress({ stage: "Designing presentation", percent: 40 });

  const prompt = buildPrompt({
    toolType:        "SLIDE_DECK",
    documentContent: text,
    documentId:      getDocumentId(text),
    isRefresh,
  });

  const raw = await callGroq(prompt, "", "llama-3.1-8b-instant");

  await job.updateProgress({ stage: "Finalising slides", percent: 80 });

  const parsed = safeParseJson<SlideDeckOutput>(raw);
  // Normalise array response
  if (Array.isArray(parsed)) {
    return { title: resource.originalFilename, subtitle: "", totalSlides: parsed.length, slides: parsed as unknown as Slide[] };
  }
  return parsed;
}
