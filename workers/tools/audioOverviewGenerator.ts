/**
 * @file audioOverviewGenerator.ts
 * @description Generates a two-voice podcast from document text using Edge TTS.
 * Pipeline: Groq script → Edge TTS per turn → base64 audio array
 *
 * Vercel-compatible: No ffmpeg stitching. Each dialogue turn is returned as
 * a base64 MP3 segment. The PodcastPlayer plays them sequentially in the browser.
 *
 * Voice A: en-US-JennyNeural — "Jamie", curious student
 * Voice B: en-US-GuyNeural   — "Alex", knowledgeable explainer
 */

import { Job } from "bullmq";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { callGroq, safeParseJson, streamToBuffer } from "@/lib/studyToolPipeline";

// ─── Script generation ────────────────────────────────────────────────────────

const SCRIPT_SYSTEM_PROMPT = `
You produce podcast scripts for two university students.
Jamie (A) just read the document for the first time — curious, asks real questions.
Alex (B) knows the subject deeply — explains clearly with analogies and examples.

OUTPUT ONLY a valid JSON array. No preamble. No markdown fences.

SCHEMA: [{ "speaker": "A" | "B", "text": "string" }]

SCRIPT RULES:
- 30 to 45 turns total (shorter for Vercel timeout safety)
- Alex speaks first to set context, then Jamie asks
- Vary turn length: some 1-sentence, some 3-4 sentence explanations
- Include 3 "wait, seriously?" moments where a fact surprises Jamie
- Use real analogies: "it's like..." moments
- Last turn: Alex ends on an open question that makes the LISTENER think
- FORBIDDEN PHRASES: "absolutely", "great question", "in conclusion", "to summarise"
- FORBIDDEN: Any turn longer than 5 sentences
- Each speaker has a consistent voice throughout

OUTPUT ONLY THE JSON ARRAY. NOTHING ELSE.
`;

interface ScriptTurn {
  speaker: "A" | "B";
  text:    string;
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

const VOICE_MAP: Record<"A" | "B", string> = {
  A: "en-US-JennyNeural",
  B: "en-US-GuyNeural",
};

async function synthesizeTurn(
  tts:     MsEdgeTTS,
  speaker: "A" | "B",
  text:    string
): Promise<string> {
  await tts.setMetadata(
    VOICE_MAP[speaker],
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );
  const buffer = await streamToBuffer(tts.toStream(text) as unknown as import("stream").Readable);
  return buffer.toString("base64");
}

// ─── Output type ──────────────────────────────────────────────────────────────

export interface AudioOverviewOutput {
  scriptJson:    string;     // JSON array of { speaker, text, audioBase64 }
  speakerA:      string;
  speakerB:      string;
  totalTurns:    number;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generates a two-voice podcast audio overview from document text.
 * Returns base64-encoded MP3 per turn — no ffmpeg, Vercel-compatible.
 */
export async function generateAudioOverview(
  text:     string,
  resource: { originalFilename: string; id: string },
  job:      Job
): Promise<AudioOverviewOutput> {
  // ── Step 1: Generate script ──
  await job.updateProgress({ stage: "Writing podcast script", percent: 30 });

  const rawScript = await callGroq(
    SCRIPT_SYSTEM_PROMPT,
    `Document title: "${resource.originalFilename}"\n\nDocument content:\n${text}`,
    "llama-3.3-70b-versatile"
  );

  const turns = safeParseJson<ScriptTurn[]>(rawScript);

  // ── Step 2: Synthesize each turn ──
  await job.updateProgress({ stage: "Generating voices", percent: 40 });

  const tts = new MsEdgeTTS();
  const enrichedTurns: Array<ScriptTurn & { audioBase64: string }> = [];

  for (let i = 0; i < turns.length; i++) {
    const turn        = turns[i];
    const audioBase64 = await synthesizeTurn(tts, turn.speaker, turn.text);

    enrichedTurns.push({ ...turn, audioBase64 });

    if (i % 5 === 0) {
      const percent = 40 + Math.round((i / turns.length) * 55);
      await job.updateProgress({
        stage:   `Generating voices (${i + 1}/${turns.length})`,
        percent,
      });
    }
  }

  await job.updateProgress({ stage: "Done", percent: 100 });

  return {
    scriptJson: JSON.stringify(enrichedTurns),
    speakerA:   "Jamie",
    speakerB:   "Alex",
    totalTurns: enrichedTurns.length,
  };
}
