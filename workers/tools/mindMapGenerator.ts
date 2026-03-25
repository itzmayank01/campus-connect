/**
 * @file mindMapGenerator.ts — uses master prompt builder
 */
import { Job } from "bullmq";
import { callGroq, safeParseJson } from "@/lib/studyToolPipeline";
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
    for (const c of (b.children ?? [])) lines.push(`### ${c}`);
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

  const raw = await callGroq("Return ONLY valid JSON. No explanation, no markdown.", prompt, "llama-3.1-8b-instant");

  await job.updateProgress({ stage: "Building mind map", percent: 75 });

  // safeParseJson uses balanced-brace extractor — handles trailing prose
  // that llama-3.1-8b-instant appends after the JSON block
  const parsed = safeParseJson<{ root: string; branches: Array<{ name: string; children: string[] }> }>(raw);

  if (!parsed.root || !Array.isArray(parsed.branches)) {
    throw new Error(`Mind map JSON missing root or branches. Got: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  const markdown  = jsonToMarkdown(parsed);
  const nodeCount = 1 + parsed.branches.length + parsed.branches.reduce((s, b) => s + (b.children?.length ?? 0), 0);

  return { markdown, title: parsed.root, nodeCount, depth: 3 };
}
