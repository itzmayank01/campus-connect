/**
 * @file dataTableGenerator.ts
 * @description Extracts structured tabular data from documents.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You extract structured tabular data from academic documents.
Output ONLY a valid JSON object. No markdown. No explanation. No preamble.

If the document contains tables, lists of comparable items, or structured data:
{
  "hasData": true,
  "title": "string",
  "description": "string",
  "columns": [{ "key": "string (camelCase)", "label": "string", "type": "string" | "number" | "date" | "percentage" }],
  "rows": [{ "column_key": "value" }],
  "notes": "string or null"
}

If no structured data exists:
{
  "hasData": false,
  "reason": "string"
}

RULES: Max 50 rows. Only extract genuinely structured data. Never fabricate data.
OUTPUT ONLY THE JSON. NOTHING ELSE.
`;

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
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<DataTableOutput> {
  await job.updateProgress({ stage: "Extracting structured data", percent: 40 });
  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.1-8b-instant"
  );
  await job.updateProgress({ stage: "Structuring table", percent: 80 });
  return safeParseJson<DataTableOutput>(raw);
}
