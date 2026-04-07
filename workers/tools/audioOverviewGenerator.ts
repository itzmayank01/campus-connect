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
 *
 * ROOT CAUSE FIX (msedge-tts v2.x):
 * toStream() returns { audioStream: Readable, metadataStream, requestId }
 * The OLD code treated the entire return value as a Readable stream, causing
 * "e is not async iterable" since a plain object has no Symbol.asyncIterator.
 * FIX: Access .audioStream from the result before passing to streamToBuffer().
 */

import { Job } from "bullmq";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { callGroq, safeParseJson, streamToBuffer } from "@/lib/studyToolPipeline";
import { Readable } from "stream";

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

/**
 * Synthesizes one dialogue turn into a base64-encoded MP3 string.
 *
 * Creates a fresh MsEdgeTTS instance per call — reusing a single instance
 * across multiple setMetadata() calls can cause stale WebSocket connections.
 *
 * CRITICAL: msedge-tts v2.x toStream() returns { audioStream, metadataStream, requestId }.
 * We must access .audioStream to get the actual Node.js Readable stream.
 */
async function synthesizeTurn(
  speaker: "A" | "B",
  text:    string
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error(`Empty text for speaker ${speaker} — skipping`);
  }

  const tts = new MsEdgeTTS();

  await tts.setMetadata(
    VOICE_MAP[speaker],
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const result = tts.toStream(text.trim());

  // msedge-tts v2.x: toStream() returns { audioStream, metadataStream, requestId }
  // We need the audioStream — it's a proper Node.js Readable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamResult = result as any;
  const audioStream: Readable | undefined =
    streamResult?.audioStream ??  // v2.x API
    (typeof streamResult?.on === "function" ? streamResult : undefined);  // v1.x fallback

  if (!audioStream || typeof audioStream.on !== "function") {
    throw new Error(
      `Edge TTS toStream() did not return a valid audioStream for speaker ${speaker}. ` +
      `Got keys: ${Object.keys(streamResult ?? {}).join(", ")}. ` +
      `Voice "${VOICE_MAP[speaker]}" may be unavailable.`
    );
  }

  const buffer = await streamToBuffer(audioStream);
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

  if (!Array.isArray(turns) || turns.length === 0) {
    throw new Error("Groq returned invalid script format (expected non-empty array of turns)");
  }

  console.log(`[AudioOverview] Script generated: ${turns.length} turns`);

  // ── Step 2: Synthesize each turn ──
  await job.updateProgress({ stage: "Generating voices", percent: 40 });

  const enrichedTurns: Array<ScriptTurn & { audioBase64: string }> = [];
  let failures = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    // Skip empty turns
    if (!turn.text || turn.text.trim().length === 0) {
      console.warn(`[AudioOverview] Skipping empty turn ${i + 1}`);
      continue;
    }

    // Validate speaker
    if (turn.speaker !== "A" && turn.speaker !== "B") {
      console.warn(`[AudioOverview] Invalid speaker "${turn.speaker}" at turn ${i + 1}, defaulting to A`);
      turn.speaker = "A";
    }

    try {
      const audioBase64 = await synthesizeTurn(turn.speaker, turn.text);
      enrichedTurns.push({ ...turn, audioBase64 });
    } catch (err) {
      failures++;
      const msg = err instanceof Error ? err.message : "Unknown TTS error";
      console.error(`[AudioOverview] Turn ${i + 1} TTS failed: ${msg}`);

      // Allow up to 5 individual turn failures — skip those turns
      if (failures > 5) {
        throw new Error(
          `Too many TTS failures (${failures}). Last error: ${msg}`
        );
      }
      continue;
    }

    if (i % 5 === 0) {
      const percent = 40 + Math.round((i / turns.length) * 55);
      await job.updateProgress({
        stage:   `Generating voices (${i + 1}/${turns.length})`,
        percent,
      });
    }
  }

  if (enrichedTurns.length === 0) {
    throw new Error(
      "All TTS calls failed — no audio segments were generated. " +
      "Edge TTS service may be temporarily unavailable."
    );
  }

  console.log(
    `[AudioOverview] Done: ${enrichedTurns.length}/${turns.length} turns synthesized` +
    (failures > 0 ? ` (${failures} failures skipped)` : "")
  );

  await job.updateProgress({ stage: "Done", percent: 100 });

  return {
    scriptJson: JSON.stringify(enrichedTurns),
    speakerA:   "Jamie",
    speakerB:   "Alex",
    totalTurns: enrichedTurns.length,
  };
}
