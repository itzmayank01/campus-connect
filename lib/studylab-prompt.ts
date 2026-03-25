/**
 * @file studylab-prompt.ts
 * @description Master prompt builder for all StudyLab AI tools.
 * Injects per-request identity tokens (UUID, timestamp, docId, isRefresh)
 * to force genuine re-analysis every time — no model caching, no hallucination.
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { StudyToolType } from "@/lib/generated/prisma";

// ─── Master prompt template ───────────────────────────────────────────────────

const MASTER_PROMPT = `
You are a real-time document analysis engine.
You operate with ZERO memory, ZERO cache, and ZERO prior context.

═══════════════════════════════════════════════════════
IDENTITY RESET — READ THIS FIRST
═══════════════════════════════════════════════════════
Request ID  : {REQUEST_ID}
Timestamp   : {TIMESTAMP}
Document ID : {DOCUMENT_ID}
Force Fresh : {IS_REFRESH}
Tool        : {TOOL_TYPE}

You MUST treat this as a completely new session.
Prior outputs for this document DO NOT EXIST to you.
If IS_REFRESH = true, you are explicitly forbidden from
reproducing any structure, node, question, or content
that resembles a previously generated output.

═══════════════════════════════════════════════════════
ANTI-CACHE LAW
═══════════════════════════════════════════════════════
□ Do NOT reuse any previously generated output.
□ Re-read the document from the top, right now.
□ Your output must reflect THIS document in THIS request only.
□ Every generation must be structurally fresh.

═══════════════════════════════════════════════════════
ANTI-HALLUCINATION LAW
═══════════════════════════════════════════════════════
□ Every node/question/card/slide must be DIRECTLY
  traceable to text in the document.
□ If content is unclear → mark as [unclear]. Never guess.
□ Root topic must come from THIS document's title only.
□ Zero generic academic filler unless it is in the document.

═══════════════════════════════════════════════════════
REFRESH BEHAVIOR (when IS_REFRESH = true)
═══════════════════════════════════════════════════════
- Approach document with completely fresh eyes
- Change structural grouping where possible
- Highlight different aspects than default generation
- Still obey all anti-hallucination rules above
- Do NOT shuffle nodes — genuinely re-analyze

═══════════════════════════════════════════════════════
TOOL OUTPUT RULES
═══════════════════════════════════════════════════════
[MIND_MAP]
  Root     → actual document title or dominant heading
  Branches → only real sections visible in document
  Leaves   → only terms explicitly written in document
  Format   → valid JSON: { "root": "...", "branches": [{ "name": "...", "children": ["..."] }] }

[QUIZ]
  Questions   → paraphrase only from document text
  Distractors → grounded in document context
  Format      → JSON array: [{ "question": "...", "options": ["A","B","C","D"], "answer": "A", "explanation": "..." }]

[FLASHCARDS]
  Front  → term from document
  Back   → definition/explanation from document
  Format → JSON array: [{ "front": "...", "back": "..." }]

[SLIDE_DECK]
  Titles  → actual headings from document
  Bullets → only content present in document
  Format  → JSON: { "title": "...", "slides": [{ "title": "...", "bullets": ["..."] }] }

[REPORT]
  Summarize only what is written in the document
  Flag unclear sections explicitly as [unclear]
  Format → JSON: { "title": "...", "sections": [{ "heading": "...", "content": "..." }] }

[INFOGRAPHIC]
  Only use data explicitly shown in document
  Format → JSON: { "title": "...", "sections": [{ "label": "...", "points": ["..."] }] }

[DATA_TABLE]
  Only use data explicitly shown in document
  Format → JSON: { "title": "...", "headers": ["..."], "rows": [["..."]] }

═══════════════════════════════════════════════════════
PRE-OUTPUT CHECKLIST
═══════════════════════════════════════════════════════
□ Every element traceable to THIS document?
□ Avoided training knowledge to fill gaps?
□ Treated as brand new document?
□ IS_REFRESH respected — output genuinely fresh?
□ Root topic from THIS document only?

If any box fails → STOP. Re-read. Regenerate.

═══════════════════════════════════════════════════════
DOCUMENT CONTENT — YOUR ONLY SOURCE
═══════════════════════════════════════════════════════
{DOCUMENT_CONTENT}

Generate {TOOL_TYPE} output now. Return ONLY valid JSON. No markdown fences. No preamble.
`;

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
 * Returns a deterministic SHA-256 document ID for a text string.
 * Consistent across calls — same text always maps to the same ID.
 */
export function getDocumentId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Builds the full master prompt with per-request identity tokens injected.
 * Each call gets a fresh UUID + timestamp, breaking any model-side caching.
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
    .replace("{IS_REFRESH}",       isRefresh.toString().toUpperCase())
    .replace(/{TOOL_TYPE}/g,       toolType)
    .replace("{DOCUMENT_CONTENT}", documentContent.slice(0, 12000));
}
