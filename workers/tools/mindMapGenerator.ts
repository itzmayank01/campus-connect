/**
 * @file mindMapGenerator.ts
 * @description Extracts a document-grounded mind map using the document-faithful
 * JSON prompt. Every node is sourced verbatim from the document — no invented topics.
 * The JSON is then converted to markdown for markmap-lib rendering.
 */

import { Job } from "bullmq";
import { callGroq } from "@/lib/studyToolPipeline";

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a mind map extraction engine. Your ONLY job is to extract and structure information that is EXPLICITLY present in the provided document.

STRICT RULES:
1. NEVER invent, infer, or add topics not present in the document.
2. NEVER use generic academic categories (e.g., "Learning Mechanisms", "Technology Integration") unless those exact words appear in the document.
3. Every single node in the mind map MUST be a concept, term, heading, or idea that appears verbatim or near-verbatim in the document.
4. If the document is handwritten or unclear, extract only what you can confidently read — do not guess or fill gaps.
5. The root node must reflect the actual subject of the document.
6. Do NOT copy structure from any prior knowledge or training data. Treat this document as if you have never seen this topic before.

PROCESS:
- First, identify the main topic from the document title or dominant headings.
- Then extract 3–6 major branches based on actual sections or themes present.
- Under each branch, list only sub-concepts explicitly mentioned.

OUTPUT: Return ONLY valid JSON in this exact format with no markdown fences, no prose, no explanation:
{
  "root": "<actual document topic>",
  "branches": [
    {
      "name": "<section from document>",
      "children": ["<term from doc>", "<term from doc>"]
    }
  ]
}

If you cannot extract meaningful structure from the document, return:
{ "error": "Document too unclear to extract mind map" }

DO NOT return a mind map if you are not grounding every node in the document.`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MindMapJSON {
  root: string;
  branches: Array<{
    name: string;
    children: string[];
  }>;
}

export interface MindMapOutput {
  markdown:  string;
  title:     string;
  nodeCount: number;
  depth:     number;
}

// ─── JSON → Markdown conversion ───────────────────────────────────────────────

/**
 * Converts the structured JSON mind map to markmap-compatible markdown.
 * Root → # heading, branches → ## headings, children → ### headings.
 */
function jsonToMarkdown(json: MindMapJSON): string {
  const lines: string[] = [];
  lines.push(`# ${json.root}`);
  for (const branch of json.branches) {
    lines.push(`## ${branch.name}`);
    for (const child of branch.children) {
      lines.push(`### ${child}`);
    }
  }
  return lines.join("\n");
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generates a document-faithful mind map.
 * Uses JSON extraction to ensure every node is sourced from the document,
 * then converts to markdown for markmap-lib rendering.
 */
export async function generateMindMap(
  text:     string,
  resource: { originalFilename: string },
  job:      Job
): Promise<MindMapOutput> {
  await job.updateProgress({ stage: "Extracting document structure", percent: 40 });

  const raw = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text.slice(0, 12000)}`,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Building mind map", percent: 75 });

  // ── Parse JSON ──────────────────────────────────────────────────────────────
  let parsed: MindMapJSON;
  try {
    // Strip any accidental markdown fences
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const json = JSON.parse(cleaned);

    if (json.error) {
      throw new Error(json.error);
    }
    if (!json.root || !Array.isArray(json.branches)) {
      throw new Error("Invalid JSON structure from model");
    }
    parsed = json as MindMapJSON;
  } catch (parseErr) {
    // Fallback: try to extract any JSON object from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const fallback = JSON.parse(jsonMatch[0]);
        if (fallback.error) throw new Error(fallback.error);
        if (fallback.root && Array.isArray(fallback.branches)) {
          parsed = fallback as MindMapJSON;
        } else {
          throw new Error("Fallback JSON also malformed");
        }
      } catch {
        throw new Error(
          `Model returned unparseable output. Raw: ${raw.slice(0, 200)}`
        );
      }
    } else {
      throw new Error(
        `Model did not return JSON. Raw: ${raw.slice(0, 200)}`
      );
    }
  }

  // ── Convert to markdown ────────────────────────────────────────────────────
  const markdown = jsonToMarkdown(parsed);

  await job.updateProgress({ stage: "Done", percent: 100 });

  // ── Compute stats ──────────────────────────────────────────────────────────
  const nodeCount =
    1 +                                    // root
    parsed.branches.length +               // branch nodes
    parsed.branches.reduce((s, b) => s + b.children.length, 0); // leaf nodes

  const depth = 3; // root → branch → child = 3 levels

  return { markdown, title: parsed.root, nodeCount, depth };
}
