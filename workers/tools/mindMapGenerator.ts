/**
 * @file mindMapGenerator.ts
 * @description Document-grounded mind map generator.
 *
 * My plan:
 * 1. Use the shared buildPrompt with strong anti-hallucination rules
 * 2. Parse the model's JSON output (root + branches format)
 * 3. Convert to markmap-compatible markdown for the MindMapViewer
 * 4. Validate that the root node isn't prompt metadata (safety guard)
 *
 * Uses llama-3.3-70b-versatile — 70b is significantly more document-faithful
 * than 8b on structured extraction tasks.
 */

import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

type MindMapLeaf = string;
type MindMapChild = MindMapNode | MindMapLeaf;
interface MindMapNode {
  name: string;
  children?: MindMapChild[];
}

interface MindMapJSON {
  root: string;
  branches: Array<{
    name: string;
    children?: MindMapChild[];
  }>;
}

export interface MindMapOutput {
  markdown: string;
  title: string;
  nodeCount: number;
  depth: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a MindMapChild to markmap-style markdown lines */
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
  return (
    1 +
    json.branches.reduce(
      (s, b) => s + 1 + (b.children ?? []).reduce((s2, c) => s2 + count(c), 0),
      0
    )
  );
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateMindMap(
  text: string,
  resource: { originalFilename: string },
  job: Job,
  isRefresh = false
): Promise<MindMapOutput> {
  await job.updateProgress({ stage: "Reading document", percent: 20 });

  const prompt = buildPrompt({
    toolType: "MIND_MAP",
    documentContent: text,
    documentId: getDocumentId(text),
    isRefresh,
  });

  await job.updateProgress({ stage: "Building mind map", percent: 50 });

  // 70b is significantly more document-faithful for structured extraction
  const raw = await callGroq(
    "You are a JSON-only mind map extractor. Read the document and return ONLY valid JSON matching the requested structure. No explanation, no markdown, no preamble.",
    prompt,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Structuring nodes", percent: 85 });

  const parsed = safeParseJson<MindMapJSON>(raw);

  // Basic structure validation
  if (!parsed.root || !Array.isArray(parsed.branches)) {
    throw new Error(
      `Mind map JSON missing 'root' or 'branches'. Got: ${JSON.stringify(parsed).slice(0, 200)}`
    );
  }

  if (parsed.branches.length === 0) {
    throw new Error("Mind map has no branches — document may be empty or unreadable.");
  }

  // Safety guard: if model returned prompt metadata as root, something went wrong
  const badRoots = ["identity reset", "request", "system metadata", "mind map generator", "document start"];
  if (badRoots.some(b => parsed.root.toLowerCase().includes(b))) {
    throw new Error(
      `Model returned prompt content as root ("${parsed.root}"). Document text may be too short or unparseable.`
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
