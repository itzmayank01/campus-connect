/**
 * @file videoOverviewGenerator.ts
 * @description Generates a narrated slide deck (slides JSON + per-slide audio).
 * Frontend plays audio segments in sync with slide transitions.
 *
 * FIX: msedge-tts v2.x toStream() returns { audioStream, metadataStream, requestId }.
 * Must access .audioStream to get the actual Readable. Creates a new MsEdgeTTS
 * instance per narration to avoid stale WebSocket connections.
 */

import { Job } from "bullmq";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { Readable } from "stream";
import { callGroq, safeParseJson, streamToBuffer } from "@/lib/studyToolPipeline";
import { generateSlides, SlideDeckOutput } from "./slideGenerator";

const NARRATION_SYSTEM_PROMPT = `
You write voiceover narration scripts for presentation slides.
Output ONLY a valid JSON array of strings. No preamble. No markdown.
Each string is the narration for one slide.

RULES:
- 3 to 5 natural-speech sentences per slide
- First slide: greet and introduce the topic
- Content slides: expand on the bullets, don't just read them
- Last slide: summarise and give a memorable closing thought
- Write as if speaking aloud, contractions are fine
- No filler: no "um", "so yeah", "as I mentioned"

OUTPUT ONLY THE JSON ARRAY. NOTHING ELSE.
`;

export interface VideoOverviewOutput {
  slides: SlideDeckOutput;
  narrations: string[];
  audioBase64: string[];
  totalDuration: number;
}

/**
 * Extracts the audioStream from msedge-tts toStream() result.
 * v2.x returns { audioStream, metadataStream, requestId }.
 * v1.x returned a Readable directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAudioStream(result: any): Readable {
  // v2.x: result has .audioStream which is a Readable
  if (result?.audioStream && typeof result.audioStream.on === "function") {
    return result.audioStream as Readable;
  }
  // v1.x fallback: result itself is a Readable
  if (result && typeof result.on === "function") {
    return result as Readable;
  }
  throw new Error(
    `TTS toStream() did not return a valid stream. ` +
    `Got keys: ${Object.keys(result ?? {}).join(", ")}`
  );
}

/**
 * Generates a narrated slide deck from document text.
 */
export async function generateVideoOverview(
  text: string,
  resource: { originalFilename: string; id: string },
  job: Job
): Promise<VideoOverviewOutput> {
  await job.updateProgress({ stage: "Creating presentation structure", percent: 30 });
  const slides = await generateSlides(text, resource, job);

  await job.updateProgress({ stage: "Writing narration scripts", percent: 45 });
  const slideSummaries = slides.slides
    .map((s) => `Slide ${s.index} (${s.type}): ${s.title}. ${(s.bullets ?? []).join(". ")}`)
    .join("\n");

  const raw = await callGroq(
    NARRATION_SYSTEM_PROMPT,
    `Presentation: "${slides.title}"\n\nSlide content:\n${slideSummaries}`,
    "llama-3.3-70b-versatile"
  );

  const narrations = safeParseJson<string[]>(raw);

  await job.updateProgress({ stage: "Generating voiceover audio", percent: 60 });
  const audioBase64: string[] = [];

  for (let i = 0; i < narrations.length; i++) {
    const narrationText = narrations[i];

    // Skip empty narrations
    if (!narrationText || narrationText.trim().length === 0) {
      console.warn(`[VideoOverview] Skipping empty narration for slide ${i + 1}`);
      audioBase64.push(""); // Placeholder to keep index alignment with slides
      continue;
    }

    try {
      // Create a fresh TTS instance per narration — reusing causes stale connections
      const tts = new MsEdgeTTS();
      await tts.setMetadata("en-US-GuyNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const result = tts.toStream(narrationText.trim());
      const audioStream = extractAudioStream(result);

      const buffer = await streamToBuffer(audioStream);
      audioBase64.push(buffer.toString("base64"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown TTS error";
      console.error(`[VideoOverview] TTS failed for slide ${i + 1}: ${msg}`);
      audioBase64.push(""); // Placeholder — frontend should handle missing audio
    }

    const percent = 60 + Math.round((i / narrations.length) * 30);
    await job.updateProgress({ stage: `Generating audio (${i + 1}/${narrations.length})`, percent });
  }

  const totalWords = narrations.join(" ").split(/\s+/).length;
  const totalDuration = Math.round((totalWords / 140) * 60);

  return { slides, narrations, audioBase64, totalDuration };
}
