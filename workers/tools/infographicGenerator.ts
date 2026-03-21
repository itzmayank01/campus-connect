/**
 * @file infographicGenerator.ts
 * @description Extracts visual data for SVG infographic rendering.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are a data journalist who extracts compelling visual facts from text.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

OUTPUT SCHEMA:
{
  "title": "string — 4-8 words",
  "headlineStat": { "value": "string", "label": "string", "context": "string (max 20 words)" },
  "stats": [{ "value": "string", "label": "string (max 6 words)", "trend": "up" | "down" | "neutral", "icon": "trending-up" | "users" | "clock" | "award" | "globe" | "zap" }],
  "comparison": [{ "label": "string", "value": number (0-100), "color": "blue" | "green" | "amber" | "red" | "purple" }],
  "timeline": [{ "year": "string", "event": "string (max 10 words)" }],
  "keyQuote": "string",
  "keyQuoteSource": "string or null"
}

RULES: stats 4-6, comparison 3-5, timeline 3-6. Never invent statistics. If no data exists for a section, return empty array.
OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

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
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<InfographicOutput> {
  await job.updateProgress({ stage: "Extracting visual data", percent: 40 });
  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.1-8b-instant"
  );
  await job.updateProgress({ stage: "Building infographic", percent: 80 });
  return safeParseJson<InfographicOutput>(raw);
}
