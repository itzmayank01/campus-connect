/**
 * @file mindMapGenerator.ts
 * @description Document-grounded mind map generator.
 * Uses a specific prompt with clear DOCUMENT START delimiter so the
 * model never confuses prompt metadata with document content.
 */

import { Job } from "bullmq";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";

// ─── Prompt ───────────────────────────────────────────────────────────────────

const MIND_MAP_SYSTEM = "You are a JSON-only mind map generator. Read the document below and return ONLY a valid JSON object. No explanation, no markdown, no preamble.";

const MIND_MAP_PROMPT = `You are a mind map generator. Your only job is to read the document below and convert it into a structured mind map.

STRICT RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IGNORE everything above the line "DOCUMENT START".
   The request metadata (IDs, timestamps, flags) is for
   system use only. NEVER put it in the mind map.

2. READ the document slowly and completely before generating.
   Take your time. Quality over speed.

3. ROOT NODE = the actual subject/title of the document.
   Not "IDENTITY RESET". Not "Request". The real topic.

4. BRANCHES = only real sections/headings found in document.

5. LEAF NODES = only terms, concepts, definitions explicitly
   written in the document. Nothing from your training data.

6. If handwritten → read what is visually present only.
   Never autocomplete. Never assume. Mark unclear text as [unclear].

7. ZERO HALLUCINATION. Every node must be traceable to
   a specific line or diagram in the document.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — return this exact JSON structure:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "root": "<actual document topic>",
  "branches": [
    {
      "name": "<section from document>",
      "children": [
        {
          "name": "<concept from document>",
          "children": ["<detail>", "<detail>"]
        }
      ]
    }
  ]
}

Return ONLY the JSON. No explanation. No preamble. No markdown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE-GENERATION CHECK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing output, ask yourself:
→ What is the REAL topic of this document?
→ What are the ACTUAL sections/headings?
→ Did I accidentally include any metadata? If yes, remove it.
→ Is every node from the document, not my training data?

If root = "IDENTITY RESET" or "Request" → STOP. You are
reading the prompt, not the document. Scroll down further.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SYSTEM METADATA — DO NOT MAP THIS ⚠️
  req_id    : {REQUEST_ID}
  timestamp : {TIMESTAMP}
  doc_id    : {DOCUMENT_ID}
  refresh   : {IS_REFRESH}
  tool      : MIND_MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼▼▼ DOCUMENT START — READ FROM HERE ▼▼▼
{DOCUMENT_CONTENT}
▲▲▲ DOCUMENT END ▲▲▲

Now generate the mind map JSON from the document above.
The root must be the document's actual subject.
Begin.`;

// ─── Types ────────────────────────────────────────────────────────────────────

// The model returns children as either strings OR nested objects
type MindMapLeaf = string;
type MindMapNode = { name: string; children?: Array<MindMapNode | MindMapLeaf> };
type MindMapChild = MindMapNode | MindMapLeaf;

interface MindMapJSON {
  root: string;
  branches: Array<{
    name: string;
    children?: MindMapChild[];
  }>;
}

export interface MindMapOutput {
  markdown:  string;
  title:     string;
  nodeCount: number;
  depth:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt(documentContent: string, isRefresh: boolean): string {
  const docId = createHash("sha256").update(documentContent).digest("hex").slice(0, 16);
  return MIND_MAP_PROMPT
    .replace("{REQUEST_ID}",       randomUUID())
    .replace("{TIMESTAMP}",        Date.now().toString())
    .replace("{DOCUMENT_ID}",      docId)
    .replace("{IS_REFRESH}",       isRefresh ? "TRUE" : "FALSE")
    .replace("{DOCUMENT_CONTENT}", documentContent.slice(0, 10000));
}

/**
 * Recursively converts a MindMapNode or leaf string to markdown heading lines.
 * root=1, branch=2, concept=3, detail=4 (bullet).
 */
function nodeToMarkdown(node: MindMapChild, depth: number): string[] {
  if (typeof node === "string") {
    return [`${"#".repeat(Math.min(depth, 4))} ${node}`];
  }
  const lines: string[] = [`${"#".repeat(Math.min(depth, 4))} ${node.name}`];
  for (const child of node.children ?? []) {
    lines.push(...nodeToMarkdown(child, depth + 1));
  }
  return lines;
}

function jsonToMarkdown(json: MindMapJSON): string {
  const lines: string[] = [`# ${json.root}`];
  for (const branch of json.branches) {
    lines.push(`## ${branch.name}`);
    for (const child of branch.children ?? []) {
      lines.push(...nodeToMarkdown(child, 3));
    }
  }
  return lines.join("\n");
}

function countNodes(json: MindMapJSON): number {
  function count(node: MindMapChild): number {
    if (typeof node === "string") return 1;
    return 1 + (node.children ?? []).reduce((s, c) => s + count(c), 0);
  }
  return 1 + json.branches.reduce((s, b) => s + 1 + (b.children ?? []).reduce((s2, c) => s2 + count(c), 0), 0);
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateMindMap(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<MindMapOutput> {
  await job.updateProgress({ stage: "Reading document", percent: 30 });

  const prompt = buildPrompt(text, isRefresh);

  await job.updateProgress({ stage: "Building mind map", percent: 60 });

  const raw = await callGroq(MIND_MAP_SYSTEM, prompt, "llama-3.1-8b-instant");

  await job.updateProgress({ stage: "Structuring nodes", percent: 90 });

  const parsed = safeParseJson<MindMapJSON>(raw);

  if (!parsed.root || !Array.isArray(parsed.branches)) {
    throw new Error(
      `Mind map JSON missing root or branches. Got: ${JSON.stringify(parsed).slice(0, 200)}`
    );
  }

  // Guard: if model accidentally put prompt metadata as root, throw so retry works
  const badRoots = ["identity reset", "request", "system metadata", "mind map generator"];
  if (badRoots.some(b => parsed.root.toLowerCase().includes(b))) {
    throw new Error(
      `Model returned prompt content as root ("${parsed.root}"). ` +
      `This usually means document content was empty or too short.`
    );
  }

  const markdown = jsonToMarkdown(parsed);

  return {
    markdown,
    title:     parsed.root,
    nodeCount: countNodes(parsed),
    depth:     4,
  };
}
