/**
 * @file dataTableGenerator.ts
 * @description Extracts structured tabular data from documents.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";
export interface DataTableOutput {
  hasData: boolean;
  title?: string;
  description?: string;
  columns?: Array<{ key: string; label: string; type: "string" | "number" | "date" | "percentage" }>;
  rows?: Record<string, string>[];
  notes?: string;
  reason?: string;
}

/**
 * Generates structured table data from document text.
 */
export async function generateDataTable(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<DataTableOutput> {
  await job.updateProgress({ stage: "Extracting structured data", percent: 40 });
  const prompt = buildPrompt({ toolType: "DATA_TABLE", documentContent: text, documentId: getDocumentId(text), isRefresh });
  const raw = await callGroq(prompt, "", "llama-3.1-8b-instant");
  await job.updateProgress({ stage: "Structuring table", percent: 80 });
  return safeParseJson<DataTableOutput>(raw);
}
