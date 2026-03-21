/**
 * @file videoOverviewGenerator.ts
 * @description Generates a narrated slide deck (slides JSON + per-slide audio).
 * Frontend plays audio segments in sync with slide transitions.
 */

import { Job } from "bullmq";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
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
  const tts = new MsEdgeTTS();
  const audioBase64: string[] = [];

  for (let i = 0; i < narrations.length; i++) {
    await tts.setMetadata("en-US-GuyNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const buffer = await streamToBuffer(tts.toStream(narrations[i]) as unknown as import("stream").Readable);
    audioBase64.push(buffer.toString("base64"));

    const percent = 60 + Math.round((i / narrations.length) * 30);
    await job.updateProgress({ stage: `Generating audio (${i + 1}/${narrations.length})`, percent });
  }

  const totalWords = narrations.join(" ").split(/\s+/).length;
  const totalDuration = Math.round((totalWords / 140) * 60);

  return { slides, narrations, audioBase64, totalDuration };
}
