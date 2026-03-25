/**
 * @file mindMapGenerator.ts — uses master prompt builder
 */
import { Job } from "bullmq";
import { callGroq } from "@/lib/studyToolPipeline";
import { buildPrompt, getDocumentId } from "@/lib/studylab-prompt";

export interface MindMapOutput {
  markdown:  string;
  title:     string;
  nodeCount: number;
  depth:     number;
}

function jsonToMarkdown(json: { root: string; branches: Array<{ name: string; children: string[] }> }): string {
  const lines = [`# ${json.root}`];
  for (const b of json.branches) {
    lines.push(`## ${b.name}`);
    for (const c of b.children) lines.push(`### ${c}`);
  }
  return lines.join("\n");
}

export async function generateMindMap(
  text:      string,
  resource:  { originalFilename: string },
  job:       Job,
  isRefresh  = false
): Promise<MindMapOutput> {
  await job.updateProgress({ stage: "Extracting document structure", percent: 40 });

  const prompt = buildPrompt({
    toolType:        "MIND_MAP",
    documentContent: text,
    documentId:      getDocumentId(text),
    isRefresh,
  });

  const raw = await callGroq(prompt, "", "llama-3.3-70b-versatile");

  await job.updateProgress({ stage: "Building mind map", percent: 75 });

  // Parse JSON (strip any accidental fences)
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: { root: string; branches: Array<{ name: string; children: string[] }> };
  try {
    parsed = JSON.parse(cleaned);
    if (parsed.root === undefined) throw new Error("Missing root");
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Model did not return JSON. Got: ${raw.slice(0, 200)}`);
    parsed = JSON.parse(m[0]);
  }

  const markdown  = jsonToMarkdown(parsed);
  const nodeCount = 1 + parsed.branches.length + parsed.branches.reduce((s, b) => s + b.children.length, 0);

  return { markdown, title: parsed.root, nodeCount, depth: 3 };
}
