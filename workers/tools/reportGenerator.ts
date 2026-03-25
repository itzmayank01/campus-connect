/**
 * @file reportGenerator.ts
 * @description Generates a structured study report as JSON.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";
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
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<ReportOutput> {
  await job.updateProgress({ stage: "Writing study report", percent: 40 });
  const prompt = buildPrompt({ toolType: "REPORT", documentContent: text, documentId: getDocumentId(text), isRefresh });
  const raw = await callGroq("Return ONLY valid JSON. No explanation, no markdown.", prompt, "llama-3.1-8b-instant");
  await job.updateProgress({ stage: "Reviewing report", percent: 80 });
  return safeParseJson<ReportOutput>(raw);
}
