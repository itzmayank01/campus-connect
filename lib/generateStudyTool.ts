/**
 * @file generateStudyTool.ts
 * @description Runs a study tool generation pipeline inline (no BullMQ worker needed).
 * Called from the POST /api/study-tools route via Next.js after() for background execution.
 * Supports Vercel serverless deployment — no persistent worker process required.
 */

import { prisma } from "@/lib/prisma";
import { StudyToolType } from "@/lib/generated/prisma";
import { fetchFromS3, extractText, cleanAndChunk } from "@/lib/studyToolPipeline";
// @ts-expect-error — youtube-transcript has no type declarations
import { YoutubeTranscript } from "youtube-transcript";

import { generateMindMap }       from "@/workers/tools/mindMapGenerator";
import { generateFlashcards }    from "@/workers/tools/flashcardGenerator";
import { generateQuiz }          from "@/workers/tools/quizGenerator";
import { generateSlides }        from "@/workers/tools/slideGenerator";
import { generateReport }        from "@/workers/tools/reportGenerator";
import { generateInfographic }   from "@/workers/tools/infographicGenerator";
import { generateDataTable }     from "@/workers/tools/dataTableGenerator";
import { generateAudioOverview } from "@/workers/tools/audioOverviewGenerator";
import { generateVideoOverview } from "@/workers/tools/videoOverviewGenerator";

// ─── Fake job object ──────────────────────────────────────────────────────────
// Generators expect a BullMQ Job for progress updates.
// In the serverless context we don't track fine-grained progress,
// but we still pass a no-op job so the generator code doesn't change.

type FakeJob = {
  id: string;
  updateProgress: (data: object) => Promise<void>;
};

function makeFakeJob(toolId: string): FakeJob {
  return {
    id: toolId,
    updateProgress: async () => { /* no-op — DB status is the source of truth */ },
  };
}

// ─── Generator dispatch ───────────────────────────────────────────────────────

/**
 * Runs the full generation pipeline for one StudyTool row.
 * Updates the StudyTool row to PROCESSING → READY or FAILED.
 * Safe to call inside Next.js after() — no return value, all side-effects go to DB.
 */
export async function generateStudyTool(
  toolId:     string,
  resourceId: string,
  type:       StudyToolType,
  isRefresh   = false
): Promise<void> {
  // Mark as PROCESSING so the SSE stream starts showing progress
  await prisma.studyTool.update({
    where: { id: toolId },
    data:  { status: "PROCESSING" },
  });

  try {
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: resourceId },
    });

    // ── Get text: prefer cached extractedText, fallback to S3 pipeline ──
    let text: string;

    if (resource.textExtracted && resource.extractedText && resource.extractedText.trim().length > 50) {
      // Use cached text from upload-time Textract extraction or YouTube transcript
      text = cleanAndChunk(resource.extractedText);
      console.log(`[generateStudyTool] Using cached extractedText (${text.length} chars) for ${type}`);
    } else if (resource.mimeType === "youtube" && resource.youtubeVideoId) {
      // Extract transcript dynamically for YouTube videos
      console.log(`[generateStudyTool] Fetching YouTube transcript for videoId=${resource.youtubeVideoId}`);
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(resource.youtubeVideoId);
        const rawText = transcript.map((t: { text: string }) => t.text).join(" ");
        text = cleanAndChunk(rawText);

        // Cache the transcript
        if (rawText.trim().length > 50) {
          await prisma.resource.update({
            where: { id: resourceId },
            data: {
              extractedText: rawText,
              textExtracted: true,
              textExtractedAt: new Date(),
            },
          }).catch(err => console.warn("[generateStudyTool] Failed to cache youtube transcript:", err));
        }
      } catch (err: any) {
        throw new Error(`Failed to fetch YouTube transcript: ${err.message}. The video might not have closed captions enabled.`);
      }
    } else if (resource.s3Key) {
      // Fallback: download from S3 and extract (legacy path)
      console.log(`[generateStudyTool] No cached text — falling back to S3 pipeline for ${type}`);
      const buffer  = await fetchFromS3(resource.s3Key);
      const rawText = await extractText(buffer, resource.mimeType, resource.s3Key);
      text = cleanAndChunk(rawText);

      // Cache the extracted text for future tools (best-effort update)
      if (rawText.trim().length > 50) {
        await prisma.resource.update({
          where: { id: resourceId },
          data: {
            extractedText:   rawText,
            textExtracted:   true,
            textExtractedAt: new Date(),
          },
        }).catch(err => console.warn("[generateStudyTool] Failed to cache extracted text:", err));
      }
    } else {
      throw new Error("Resource has no extracted text, no S3 file, and is not a YouTube video — cannot generate study tools");
    }

    const fakeJob = makeFakeJob(toolId);

    // ── Dispatch to the correct generator ──
    let outputData: unknown;

    switch (type) {
      case "MIND_MAP":
        outputData = await generateMindMap(text, resource, fakeJob as never, isRefresh);
        break;
      case "FLASHCARDS":
        outputData = await generateFlashcards(text, resource, fakeJob as never, isRefresh);
        break;
      case "QUIZ":
        outputData = await generateQuiz(text, resource, fakeJob as never, isRefresh);
        break;
      case "SLIDE_DECK":
        outputData = await generateSlides(text, resource, fakeJob as never, isRefresh);
        break;
      case "REPORT":
        outputData = await generateReport(text, resource, fakeJob as never, isRefresh);
        break;
      case "INFOGRAPHIC":
        outputData = await generateInfographic(text, resource, fakeJob as never, isRefresh);
        break;
      case "DATA_TABLE":
        outputData = await generateDataTable(text, resource, fakeJob as never, isRefresh);
        break;
      case "AUDIO_OVERVIEW":
        outputData = await generateAudioOverview(text, resource, fakeJob as never);
        break;
      case "VIDEO_OVERVIEW":
        outputData = await generateVideoOverview(text, resource, fakeJob as never);
        break;
      default:
        throw new Error(`Unknown tool type: ${type}`);
    }

    // ── Persist result ──
    await prisma.studyTool.update({
      where: { id: toolId },
      data: {
        status:       "READY",
        outputJson:   JSON.stringify(outputData),
        generatedAt:  new Date(),
        errorMessage: null,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[generateStudyTool] Failed for toolId=${toolId} type=${type}:`, message);

    await prisma.studyTool.update({
      where: { id: toolId },
      data: {
        status:       "FAILED",
        errorMessage: message.slice(0, 500),
      },
    });
  }
}
