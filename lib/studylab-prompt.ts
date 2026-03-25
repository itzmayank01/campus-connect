/**
 * @file studylab-prompt.ts
 * @description Master prompt builder for all StudyLab AI tools.
 * Compact version — strips decorative formatting to minimize token usage.
 * Uses UUID + timestamp per-request to prevent model caching.
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { StudyToolType } from "@/lib/generated/prisma";

// ─── Master prompt (compact — minimizes TPD usage) ───────────────────────────

const MASTER_PROMPT = `IDENTITY RESET
Request-ID: {REQUEST_ID} | Timestamp: {TIMESTAMP} | Doc-ID: {DOCUMENT_ID} | Refresh: {IS_REFRESH} | Tool: {TOOL_TYPE}

You are a document analysis engine with ZERO memory and ZERO prior context.
Treat this as a completely new session. Prior outputs do NOT exist to you.
If IS_REFRESH=TRUE: you MUST produce different structural groupings than any prior generation.

ANTI-HALLUCINATION (mandatory):
- Every node/question/card/slide must be directly traceable to the document text.
- Never invent, infer, or use training knowledge to fill gaps.
- If content is unclear, mark as [unclear] — never guess.
- Root/title must come from THIS document only.

OUTPUT FORMAT for {TOOL_TYPE}:

[MIND_MAP] JSON only: {"root":"<doc title>","branches":[{"name":"<section>","children":["<term>","<term>"]}]}
[QUIZ] JSON array: [{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}]
[FLASHCARDS] JSON array: [{"front":"<term>","back":"<definition from doc>"}]
[SLIDE_DECK] JSON: {"title":"...","slides":[{"title":"...","bullets":["..."]}]}
[REPORT] JSON: {"title":"...","sections":[{"heading":"...","content":"..."}]}
[INFOGRAPHIC] JSON: {"title":"...","sections":[{"label":"...","points":["..."]}]}
[DATA_TABLE] JSON: {"title":"...","headers":["..."],"rows":[["..."]]}

Return ONLY valid JSON. No markdown fences. No preamble. No explanation.

DOCUMENT:
{DOCUMENT_CONTENT}

Generate {TOOL_TYPE} output now.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudyLabToolType = Extract<
  StudyToolType,
  "MIND_MAP" | "QUIZ" | "FLASHCARDS" | "SLIDE_DECK" | "REPORT" | "INFOGRAPHIC" | "DATA_TABLE"
>;

export interface BuildPromptOptions {
  toolType:        StudyLabToolType;
  documentContent: string;
  documentId:      string;
  isRefresh?:      boolean;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns a short SHA-256 document ID for a text string.
 */
export function getDocumentId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Builds the full master prompt with per-request identity tokens injected.
 * Document content is trimmed to 8000 chars to stay within token budgets.
 */
export function buildPrompt({
  toolType,
  documentContent,
  documentId,
  isRefresh = false,
}: BuildPromptOptions): string {
  return MASTER_PROMPT
    .replace("{REQUEST_ID}",       randomUUID())
    .replace("{TIMESTAMP}",        Date.now().toString())
    .replace("{DOCUMENT_ID}",      documentId)
    .replace("{IS_REFRESH}",       isRefresh ? "TRUE" : "FALSE")
    .replace(/{TOOL_TYPE}/g,       toolType)
    .replace("{DOCUMENT_CONTENT}", documentContent.slice(0, 8000)); // 8k chars ≈ 2k tokens
}
