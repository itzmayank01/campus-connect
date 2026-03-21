/**
 * @file reportGenerator.ts
 * @description Generates a structured study report as JSON.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are a senior academic who writes clear, rigorous study guides.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

OUTPUT SCHEMA:
{
  "title": "string",
  "subject": "string",
  "summary": {
    "overview": "string (2-3 sentences)",
    "keyArguments": "string (2-3 sentences)",
    "significance": "string (1-2 sentences)"
  },
  "keyConcepts": [{ "term": "string", "definition": "string (max 50 words)", "importance": "string (max 30 words)", "relatedTerms": ["string"] }],
  "keyFacts": [{ "fact": "string", "context": "string" }],
  "timeline": [{ "date": "string", "event": "string" }],
  "studyQuestions": ["string"],
  "commonMistakes": ["string"],
  "furtherReading": ["string"]
}

QUANTITY: keyConcepts 6-10, keyFacts 8-12, timeline 3-8 (omit if no temporal data), studyQuestions 5, commonMistakes 3-5, furtherReading 3-5.
OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

export interface ReportOutput {
  title: string;
  subject: string;
  summary: { overview: string; keyArguments: string; significance: string };
  keyConcepts: Array<{ term: string; definition: string; importance: string; relatedTerms: string[] }>;
  keyFacts: Array<{ fact: string; context: string }>;
  timeline?: Array<{ date: string; event: string }>;
  studyQuestions: string[];
  commonMistakes: string[];
  furtherReading: string[];
}

/**
 * Generates a structured study report from document text.
 */
export async function generateReport(
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<ReportOutput> {
  await job.updateProgress({ stage: "Writing study report", percent: 40 });
  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );
  await job.updateProgress({ stage: "Reviewing report", percent: 80 });
  return safeParseJson<ReportOutput>(raw);
}
