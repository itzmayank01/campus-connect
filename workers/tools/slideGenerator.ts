/**
 * @file slideGenerator.ts
 * @description Generates a 10-slide presentation JSON with speaker notes.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are a professional presentation designer and academic communicator.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

OUTPUT SCHEMA:
{
  "title": "string",
  "subtitle": "string",
  "totalSlides": 10,
  "slides": [
    {
      "index": number,
      "type": "title" | "content" | "quote" | "two-column" | "visual-stat" | "summary",
      "title": "string",
      "subtitle": "string or null",
      "bullets": ["max 5 bullets, max 12 words each"],
      "quote": "string or null",
      "quoteSource": "string or null",
      "col1": { "heading": "string", "bullets": ["..."] },
      "col2": { "heading": "string", "bullets": ["..."] },
      "stat": { "value": "string", "label": "string", "context": "string" },
      "note": "string — speaker note, 2-3 sentences"
    }
  ]
}

SLIDE STRUCTURE:
1. title — document title + hook
2. content — overview
3-7. core content mix
8. two-column — comparison
9. quote — impactful statement
10. summary — 5 takeaways

OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

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
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<SlideDeckOutput> {
  await job.updateProgress({ stage: "Designing presentation", percent: 40 });

  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Finalising slides", percent: 80 });
  return safeParseJson<SlideDeckOutput>(raw);
}
