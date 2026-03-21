/**
 * @file mindMapGenerator.ts
 * @description Generates a hierarchical mind map markdown string
 * from document text using Groq. Output consumed by markmap-lib on frontend.
 */

import { Job } from "bullmq";
import { callGroq } from "@/lib/studyToolPipeline";

const SYSTEM_PROMPT = `
You are an expert knowledge architect specialising in visual learning.
Your task is to convert academic document text into a hierarchical mind map.

OUTPUT FORMAT: Return ONLY markdown. No JSON. No prose. No code fences.
No preamble. No "Here is your mind map:". Just the markdown outline.

STRUCTURE RULES:
- Line 1: # [The actual topic of the document — not "Mind Map"]
- Level 2: ## [4 to 8 main conceptual themes — NOT chapter names]
- Level 3: ### [2 to 5 key concepts under each theme]
- Level 4: - [2 to 4 bullet details under each concept — max 8 words each]

CONTENT RULES:
- Every node label: 2 to 7 words maximum
- Group by CONCEPT not by document structure
- Include: definitions, causes, effects, key figures, key dates, key numbers
- Balance the tree: similar number of children across sibling nodes

ABSOLUTELY FORBIDDEN:
- Labels longer than 8 words
- Section-based grouping (Chapter 1, Section 2, Part A...)
- Any output before the # heading
- Any output after the last bullet point
`;

export interface MindMapOutput {
  markdown: string;
  title: string;
  nodeCount: number;
  depth: number;
}

/**
 * Generates an interactive mind map from document text.
 * Output is markdown ready for markmap-lib consumption.
 */
export async function generateMindMap(
  text: string,
  resource: { originalFilename: string },
  job: Job
): Promise<MindMapOutput> {
  await job.updateProgress({ stage: "Building knowledge structure", percent: 40 });

  const markdown = await callGroq(
    SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );

  await job.updateProgress({ stage: "Structuring mind map", percent: 80 });

  const lines = markdown.split("\n").filter((l) => l.trim().length > 0);
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : resource.originalFilename;
  const nodeCount = lines.filter((l) => l.startsWith("#") || l.startsWith("-")).length;
  const depth = lines.reduce((max, l) => {
    const level = l.match(/^(#{1,6})/)?.[1]?.length ?? 0;
    return Math.max(max, level);
  }, 0);

  return { markdown, title, nodeCount, depth };
}
