/**
 * @file studylabTransformations.ts
 * @description Prompts for each StudyLab tool.
 *
 * Each prompt is registered as a named Transformation in open-notebook.
 * Applied to any source via applyTransformation().
 *
 * My plan for this file:
 * 1. Define one TRANSFORMATIONS entry per StudyLab tool (7 total)
 * 2. All prompts output strict JSON — frontend renders from that JSON
 * 3. Export StudyLabToolName type for type-safe dispatch
 *
 * CRITICAL: All prompts end with "OUTPUT ONLY VALID JSON. NOTHING ELSE."
 * open-notebook injects the source content automatically — our prompt
 * is the instruction, the source text is appended by open-notebook.
 */

export const TRANSFORMATIONS = {

  // ── Mind Map ──────────────────────────────────────────────────────────────
  MIND_MAP: {
    name:  "cc_mind_map",
    title: "Mind Map",
    prompt: `You are a knowledge architect. Convert the document content into a hierarchical mind map.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation. No code fences.

{
  "title": "string — the document's actual topic (2-5 words)",
  "root": {
    "label": "string — same as title",
    "children": [
      {
        "label": "string — main theme (2-5 words)",
        "color": "string — one of: blue|green|orange|purple|teal|red",
        "children": [
          {
            "label": "string — sub-concept (2-5 words)",
            "children": [
              { "label": "string — key detail (max 7 words)" }
            ]
          }
        ]
      }
    ]
  }
}

RULES:
- Root has 4-7 main theme children
- Each theme has 2-4 sub-concepts
- Each sub-concept has 2-3 detail leaves
- ALL labels max 7 words
- Group by CONCEPT not by chapter/section structure
- Assign different colors to each main theme branch
- Include: definitions, causes, effects, key figures, key numbers
- Make it genuinely useful for exam revision

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Flashcards ────────────────────────────────────────────────────────────
  FLASHCARDS: {
    name:  "cc_flashcards",
    title: "Flashcards",
    prompt: `You are an expert exam tutor. Create 20 study flashcards from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

{
  "topic": "string — main subject",
  "totalCards": 20,
  "cards": [
    {
      "id": "card_01",
      "front": "string — question or prompt (max 25 words)",
      "back": "string — highly informative complete answer (max 70 words)",
      "hint": "string — one-phrase hint (max 8 words)",
      "difficulty": "easy",
      "type": "definition",
      "tags": ["string", "string"]
    }
  ]
}

difficulty values: "easy" | "medium" | "hard"
type values: "definition" | "application" | "comparison" | "cause_effect"

RULES:
- Exactly 20 cards: 5 easy, 10 medium, 5 hard
- Mix types: 5 definition, 5 application, 5 comparison, 5 cause_effect
- Hard cards test nuanced distinctions, not just recall
- Never ask trivially obvious questions
- Back answers must be complete standalone answers

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  QUIZ: {
    name:  "cc_quiz",
    title: "Quiz",
    prompt: `You are a university exam setter. Generate an 18-question quiz from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

{
  "topic": "string",
  "totalQuestions": 18,
  "questions": [
    {
      "id": "q01",
      "type": "mcq",
      "question": "string",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explanation": "string — why correct + why others wrong (max 80 words)",
      "difficulty": "easy",
      "concept": "string — key concept being tested"
    }
  ]
}

type values: "mcq" | "true_false" | "short_answer"
For true_false: options is [] and correct is "True" or "False"
For short_answer: options is [] and correct is the model answer

DISTRIBUTION (strict):
- 10 MCQ (4 plausible options each)
- 5 true_false (non-trivial — common misconceptions)
- 3 short_answer (require synthesis, 2-3 sentence answers)
Difficulty: 4 easy, 9 medium, 5 hard

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Slide Deck ────────────────────────────────────────────────────────────
  SLIDE_DECK: {
    name:  "cc_slide_deck",
    title: "Slide Deck",
    prompt: `You are a professional academic presenter. Create a 10-slide presentation from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

{
  "title": "string",
  "subtitle": "string — one-line description",
  "slides": [
    {
      "index": 1,
      "type": "title",
      "title": "string",
      "bullets": ["string — max 12 words each"],
      "quote": null,
      "col1": null,
      "col2": null,
      "stat": null,
      "speakerNote": "string — 2-3 sentences to say on this slide"
    }
  ]
}

type values: "title" | "content" | "quote" | "two-column" | "stat" | "summary"
For two-column: col1 and col2 are { "heading": "string", "bullets": ["string"] }
For stat: stat is { "value": "string", "label": "string", "context": "string" }
For quote: quote is the impactful sentence string
Use null for fields that don't apply to the slide type.

STRUCTURE (in order):
Slide 1: type=title. Slides 2-8: content/quote/two-column/stat.
Slide 9: type=quote (most impactful sentence from document).
Slide 10: type=summary (5 key takeaways as bullets).
Include at least 1 two-column slide and 1 stat slide if data exists.

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Report ────────────────────────────────────────────────────────────────
  REPORT: {
    name:  "cc_report",
    title: "Study Report",
    prompt: `You are a senior academic. Write a comprehensive study report from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

{
  "title": "string",
  "subject": "string — academic subject area",
  "summary": {
    "overview": "string — what this document covers (2-3 sentences)",
    "keyArguments": "string — main findings or arguments (2-3 sentences)",
    "significance": "string — why this matters (1-2 sentences)"
  },
  "keyConcepts": [
    { "term": "string", "definition": "string (highly informative, max 50 words)", "importance": "string (max 30 words)", "relatedTerms": ["string", "string"] }
  ],
  "keyFacts": ["string — specific verifiable fact from document"],
  "timeline": [{ "date": "string", "event": "string" }],
  "studyQuestions": ["string — open-ended synthesis question"],
  "commonMistakes": ["string — typical misconception about this topic"],
  "furtherReading": ["string — related topic worth exploring"]
}

QUANTITIES: keyConcepts: 6-10. keyFacts: 8-12. studyQuestions: 5.
commonMistakes: 3-5. furtherReading: 3-5.
timeline: only include if temporal content exists, else use [].

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Infographic ───────────────────────────────────────────────────────────
  INFOGRAPHIC: {
    name:  "cc_infographic",
    title: "Infographic",
    prompt: `You are a data journalist. Extract visual data for an infographic from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

{
  "title": "string — starts with a number if possible e.g. '5 Key Facts About...'",
  "headlineStat": { "value": "string", "label": "string", "context": "string (max 20 words)" },
  "stats": [
    { "value": "string", "label": "string (max 6 words)", "trend": "up", "icon": "trending-up" }
  ],
  "comparison": [
    { "label": "string", "value": 75, "color": "blue" }
  ],
  "timeline": [{ "year": "string", "event": "string (max 10 words)" }],
  "keyQuote": "string — single most impactful sentence from document",
  "keyQuoteSource": null
}

trend values: "up" | "down" | "neutral"
icon values: "trending-up" | "users" | "clock" | "award" | "globe" | "zap"
color values: "blue" | "green" | "amber" | "red" | "purple"
comparison value: 0-100 scale

RULES: stats: 4-6. comparison: 3-5. timeline: 3-6 or [].
NEVER invent statistics. Only numbers actually in the document. DO NOT provide irrelevant data that is not related to the given document. Provide highly informative visual data summary.

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

  // ── Data Table ────────────────────────────────────────────────────────────
  DATA_TABLE: {
    name:  "cc_data_table",
    title: "Data Table",
    prompt: `Extract all structured tabular data from this document.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown. No explanation.

If structured data exists:
{
  "hasData": true,
  "title": "string",
  "description": "string — what this table represents",
  "columns": [{ "key": "string", "label": "string", "type": "string" }],
  "rows": [{ "column_key": "value" }],
  "notes": null
}

column type values: "string" | "number" | "date" | "percentage"

If NO structured data exists:
{ "hasData": false, "reason": "string — what type of document this is instead" }

RULES: Max 50 rows. Only real highly informative data from document. No guessing. No invented data. DO NOT provide irrelevant data.

OUTPUT ONLY VALID JSON. NOTHING ELSE.`,
  },

} as const;

export type StudyLabToolName = keyof typeof TRANSFORMATIONS;
