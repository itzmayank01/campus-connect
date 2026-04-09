/**
 * @file studylab-prompt.ts
 * @description Per-tool prompt builders for the StudyLab pipeline.
 *
 * Anti-hallucination design principles used throughout:
 * 1. DOCUMENT DELIMITERS — clear ▼ DOCUMENT START ▼ / ▲ DOCUMENT END ▲ fences
 *    so the model always knows exactly where the source begins
 * 2. EXPLICIT NO-INVENTION — every prompt says "do NOT add knowledge from training data"
 * 3. LOW TEMPERATURE (0.2) — set in callGroq, not the prompt, but prompts reinforce it
 * 4. START ANCHOR — prompts end with "Start with [{ or {" so the model outputs JSON immediately
 * 5. DOCUMENT FIRST — document content comes LAST in the prompt (recency bias)
 * 6. 70b MODEL — much less likely to hallucinate than 8b on structured tasks
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { StudyToolType } from "@/lib/generated/prisma";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDocumentId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Inject a unique nonce to bust any prompt-level caching on refresh */
function nonce(): string {
  return `[nonce:${randomUUID().slice(0, 8)}]`;
}

/** Wrap document content with clear fences */
function wrapDoc(content: string, maxLen = 18_000): string {
  return `\n▼▼▼ DOCUMENT START ▼▼▼\n${content.slice(0, maxLen)}\n▲▲▲ DOCUMENT END ▲▲▲`;
}

export const SYSTEM_JSON =
  "You are a JSON-only output machine. Return ONLY valid JSON. No explanation, no markdown fences, no preamble, no commentary after the JSON.";

// ─── Per-tool prompt builders ─────────────────────────────────────────────────

// ── MIND MAP ──────────────────────────────────────────────────────────────────

function buildMindMapPrompt(content: string, isRefresh: boolean): string {
  return `You are a mind map extractor. Your ONLY job is to read the document below and extract its structure as JSON.

${isRefresh ? `${nonce()} Generate a DIFFERENT grouping than any previous attempt.` : ""}

STRICT RULES (all apply, no exceptions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. EVERY node label must be a term, concept, or phrase that appears IN THE DOCUMENT.
2. Do NOT add any topics from your training knowledge.
3. Do NOT add topics the document does not mention.
4. Do NOT use generic labels like "Introduction" or "Overview" unless those exact headings appear in the document.
5. The root node = the actual subject of the document (read the title/heading from the document itself).
6. Branches = the main sections/themes FOUND IN THE DOCUMENT.
7. Children = concepts EXPLICITLY STATED under each section.
8. Leaf nodes = specific terms, definitions, or facts from the document text.
9. If you cannot find enough content for a branch, reduce the branch count — do NOT invent content.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT — return ONLY this exact JSON structure, nothing else:
{
  "root": "<actual document topic from the document's own text>",
  "branches": [
    {
      "name": "<section or theme name from document>",
      "children": [
        {
          "name": "<concept from document>",
          "children": ["<specific detail from document>", "<specific detail from document>"]
        }
      ]
    }
  ]
}

NO explanation. NO markdown. NO commentary. Start your response with { immediately.
${wrapDoc(content)}

Now generate the mind map JSON. Root = the document's real topic. Begin:`;
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────────

function buildFlashcardsPrompt(content: string, isRefresh: boolean): string {
  return `You are a flashcard generator. Read the document below and create 15-20 study flashcards.

${isRefresh ? `${nonce()} Use different terms than any previous generation.` : ""}

RULES (zero exceptions):
1. Every "front" must be a QUESTION or TERM that is DIRECTLY mentioned in the document.
2. Every "back" must be the EXACT answer or definition as stated in the document.
3. Do NOT add information not present in the document — not from memory, not from training data.
4. Do NOT ask about topics the document doesn't cover.
5. "hint" must be based on the document, not general knowledge.

OUTPUT — return ONLY a valid JSON array, nothing else:
[
  {
    "front": "<question or term from document>",
    "back": "<answer or definition from document, max 60 words>",
    "hint": "<one-phrase hint from document content, max 8 words>",
    "difficulty": "easy" | "medium" | "hard",
    "type": "definition" | "application" | "comparison" | "cause_effect"
  }
]

Start your response with [ immediately. No explanation.
${wrapDoc(content)}

Generate the flashcards JSON array now:`;
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────

function buildQuizPrompt(content: string, isRefresh: boolean): string {
  return `You are an exam question writer. Read the document below and generate 15 quiz questions.

${isRefresh ? `${nonce()} Generate DIFFERENT questions than any previous attempt.` : ""}

RULES (zero exceptions):
1. Every question must be answerable using ONLY information in the document.
2. Mix the types: Include "mcq" (multiple choice), "true_false", and "short_answer".
3. For "mcq", provide 4 plausible options (A, B, C, D). "correct" should be the correct letter.
4. For "true_false", "correct" must be either "True" or "False".
5. For "short_answer", "correct" must be the exact short phrase from the document.
6. "explanation" must cite the specific part of the document where the answer appears.
7. Do NOT ask about things not mentioned in the document.

OUTPUT — return ONLY a valid JSON array, nothing else:
[
  {
    "type": "mcq",
    "question": "<question based on document content>",
    "options": ["A. <plausible option>", "B. <plausible option>", "C. <plausible option>", "D. <plausible option>"],
    "correct": "A",
    "explanation": "<why correct, citing the document>",
    "difficulty": "easy" | "medium" | "hard",
    "concept": "<main concept being tested>"
  },
  {
    "type": "true_false",
    "question": "<statement based on document content>",
    "correct": "True" | "False",
    "explanation": "<why correct>",
    "difficulty": "easy",
    "concept": "<concept>"
  },
  {
    "type": "short_answer",
    "question": "<question based on document content>",
    "correct": "<short exact answer>",
    "explanation": "<why correct>",
    "difficulty": "hard",
    "concept": "<concept>"
  }
]

Start your response with [ immediately. No explanation or preamble.
${wrapDoc(content)}

Generate the quiz JSON array now:`;
}

// ── SLIDE DECK ────────────────────────────────────────────────────────────────

function buildSlideDeckPrompt(content: string, isRefresh: boolean): string {
  return `You are a presentation builder. Read the document below and create a slide deck.

${isRefresh ? `${nonce()} Use a different structure than any previous generation.` : ""}

RULES (zero exceptions):
1. All slide titles must be taken from headings or themes IN THE DOCUMENT.
2. All bullet points must be facts, terms, or statements FROM THE DOCUMENT.
3. Generate 8-10 slides covering the full document.
4. Do NOT add information from outside the document.
5. If the document has a clear structure (sections, chapters), use that structure.

OUTPUT — return ONLY a valid JSON object, nothing else:
{
  "title": "<document title from the document itself>",
  "subtitle": "<one-line description of the document's subject>",
  "slides": [
    {
      "title": "<slide heading from document>",
      "bullets": ["<fact or point from document>", "<fact or point from document>"]
    }
  ]
}

Start your response with { immediately. No explanation.
${wrapDoc(content)}

Generate the slide deck JSON now:`;
}

// ── REPORT ────────────────────────────────────────────────────────────────────

function buildReportPrompt(content: string, isRefresh: boolean): string {
  return `You are a study report writer. Read the document below and write a structured analysis.

${isRefresh ? `${nonce()} Focus on different aspects than any previous generation.` : ""}

RULES (zero exceptions):
1. Every field must be based ONLY on what is written in the document.
2. "keyConcepts" must only list terms DEFINED in the document.
3. "keyFacts" must be specific, verifiable facts FROM the document text.
4. "studyQuestions" must be answerable from the document.
5. "commonMistakes" = typical misunderstandings ABOUT THIS TOPIC based on the document's own warnings or clarifications.
6. Do NOT add information from your training data.

OUTPUT — return ONLY a valid JSON object, nothing else:
{
  "title": "<document subject from its own text>",
  "subject": "<academic subject area>",
  "summary": {
    "overview": "<2-3 sentences: what this document covers, from the document>",
    "keyArguments": "<2-3 sentences: main points or findings in the document>",
    "significance": "<1-2 sentences: why this matters, as stated or implied in the document>"
  },
  "keyConcepts": [
    { "term": "<term from document>", "definition": "<definition from document, max 50 words>", "importance": "<from document context, max 30 words>" }
  ],
  "keyFacts": ["<specific fact from document>"],
  "studyQuestions": ["<question answerable from document>"],
  "commonMistakes": ["<misconception the document explicitly or implicitly addresses>"],
  "furtherReading": ["<related topic mentioned or implied in the document>"]
}

Start your response with { immediately. No preamble.
${wrapDoc(content)}

Generate the study report JSON now:`;
}

// ── INFOGRAPHIC ───────────────────────────────────────────────────────────────

function buildInfographicPrompt(content: string, isRefresh: boolean): string {
  return `You are a data extractor for visual infographics. Read the document and extract visualizable data.

${isRefresh ? `${nonce()} Highlight different aspects than any previous generation.` : ""}

RULES (zero exceptions):
1. ONLY extract numbers, statistics, and comparisons that are EXPLICITLY STATED in the document.
2. If the document has NO numerical data, set headlineStat to a qualitative insight and stats to [].
3. Do NOT invent statistics. Every value must be traceable to a specific sentence in the document.
4. "keyQuote" must be a verbatim or near-verbatim sentence from the document.

OUTPUT — return ONLY a valid JSON object, nothing else:
{
  "title": "<subject from document, start with a number if possible>",
  "headlineStat": { "value": "<key number or key phrase from doc>", "label": "<what it measures>", "context": "<from document, max 20 words>" },
  "stats": [
    { "value": "<number or metric from doc>", "label": "<what it is, max 6 words>", "trend": "up" | "down" | "neutral", "icon": "trending-up" | "users" | "clock" | "award" | "globe" | "zap" }
  ],
  "comparison": [
    { "label": "<item from doc>", "value": <0-100 representing relative proportion>, "color": "blue" | "green" | "amber" | "red" | "purple" }
  ],
  "timeline": [{ "year": "<date or period from doc>", "event": "<event from doc, max 10 words>" }],
  "keyQuote": "<most impactful sentence from the document verbatim>",
  "keyQuoteSource": null
}

Start with { immediately. No preamble or explanation.
${wrapDoc(content)}

Generate the infographic JSON now:`;
}

// ── DATA TABLE ────────────────────────────────────────────────────────────────

function buildDataTablePrompt(content: string): string {
  return `You are a data table extractor. Read the document and extract any structured tabular data.

RULES (zero exceptions):
1. Only extract data that is EXPLICITLY STRUCTURED in the document (tables, lists with values, comparisons).
2. If no structured data exists, return { "hasData": false, "reason": "<what type of document this is>" }.
3. Max 50 rows. Only include real data from the document.
4. Do NOT fabricate rows or values.

OUTPUT — return ONLY a valid JSON object, nothing else:

If structured data exists:
{
  "hasData": true,
  "title": "<table subject from document>",
  "description": "<what this data represents, from the document>",
  "columns": [{ "key": "<column_key>", "label": "<column name>", "type": "string" | "number" | "date" | "percentage" }],
  "rows": [{ "<column_key>": "<value from document>" }],
  "notes": null
}

If no structured data:
{ "hasData": false, "reason": "<type of document, e.g. 'Narrative textbook chapter with no tabular data'>" }

Start with { immediately. No explanation.
${wrapDoc(content)}

Generate the data table JSON now:`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPrompt({
  toolType,
  documentContent,
  documentId: _documentId, // kept for API compat, but document is now appended inline
  isRefresh = false,
}: BuildPromptOptions): string {
  switch (toolType) {
    case "MIND_MAP":    return buildMindMapPrompt(documentContent, isRefresh);
    case "QUIZ":        return buildQuizPrompt(documentContent, isRefresh);
    case "FLASHCARDS":  return buildFlashcardsPrompt(documentContent, isRefresh);
    case "SLIDE_DECK":  return buildSlideDeckPrompt(documentContent, isRefresh);
    case "REPORT":      return buildReportPrompt(documentContent, isRefresh);
    case "INFOGRAPHIC": return buildInfographicPrompt(documentContent, isRefresh);
    case "DATA_TABLE":  return buildDataTablePrompt(documentContent);
    default:
      throw new Error(`Unknown tool type: ${toolType}`);
  }
}
