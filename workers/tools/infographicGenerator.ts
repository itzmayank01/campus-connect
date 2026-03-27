/**
 * @file infographicGenerator.ts
 * @description Extracts visual data for SVG infographic rendering.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId, SYSTEM_JSON } from "@/lib/studylab-prompt";
export interface InfographicOutput {
  title: string;
  headlineStat: { value: string; label: string; context: string };
  stats: Array<{ value: string; label: string; trend: string; icon: string }>;
  comparison: Array<{ label: string; value: number; color: string }>;
  timeline: Array<{ year: string; event: string }>;
  keyQuote: string;
  keyQuoteSource: string | null;
}

/**
 * Generates infographic data from document text.
 */
export async function generateInfographic(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<InfographicOutput> {
  await job.updateProgress({ stage: "Extracting visual data", percent: 40 });
  const prompt = buildPrompt({ toolType: "INFOGRAPHIC", documentContent: text, documentId: getDocumentId(text), isRefresh });
  const raw = await callGroq(SYSTEM_JSON, prompt, "llama-3.3-70b-versatile");
  await job.updateProgress({ stage: "Building infographic", percent: 80 });
  return safeParseJson<InfographicOutput>(raw);
}
