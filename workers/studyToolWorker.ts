/**
 * @file studyToolWorker.ts
 * @description BullMQ worker that processes StudyLab generation jobs.
 * Each job corresponds to one StudyTool row in the DB.
 * The worker updates status and calls the correct generator function.
 *
 * Concurrency: 3 (safe for Groq free tier rate limits)
 * Retry: 3 attempts with exponential backoff
 * Timeout: 4 minutes (audio/video jobs can take ~2 min)
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { StudyToolType } from "@/lib/generated/prisma";
import { fetchFromS3, extractText, cleanAndChunk } from "@/lib/studyToolPipeline";

import { generateMindMap } from "./tools/mindMapGenerator";
import { generateFlashcards } from "./tools/flashcardGenerator";
import { generateQuiz } from "./tools/quizGenerator";
import { generateSlides } from "./tools/slideGenerator";
import { generateReport } from "./tools/reportGenerator";
import { generateInfographic } from "./tools/infographicGenerator";
import { generateDataTable } from "./tools/dataTableGenerator";
import { generateAudioOverview } from "./tools/audioOverviewGenerator";
import { generateVideoOverview } from "./tools/videoOverviewGenerator";

// ─── Generator map ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeneratorFn = (text: string, resource: any, job: Job) => Promise<unknown>;

const GENERATORS: Record<StudyToolType, GeneratorFn> = {
  MIND_MAP: generateMindMap,
  FLASHCARDS: generateFlashcards,
  QUIZ: generateQuiz,
  SLIDE_DECK: generateSlides,
  REPORT: generateReport,
  INFOGRAPHIC: generateInfographic,
  DATA_TABLE: generateDataTable,
  AUDIO_OVERVIEW: generateAudioOverview,
  VIDEO_OVERVIEW: generateVideoOverview,
};

// ─── Worker ───────────────────────────────────────────────────────────────────

export const worker = new Worker(
  "study-tools",
  async (job: Job<{ toolId: string; resourceId: string; userId: string; type: StudyToolType }>) => {
    const { toolId, resourceId, type } = job.data;

    await prisma.studyTool.update({
      where: { id: toolId },
      data: { status: "PROCESSING" },
    });

    try {
      const resource = await prisma.resource.findUniqueOrThrow({
        where: { id: resourceId },
      });

      await job.updateProgress({ stage: "Fetching your document", percent: 5 });

      if (!resource.s3Key) {
        throw new Error("Resource has no S3 file key — cannot process");
      }

      const buffer = await fetchFromS3(resource.s3Key);

      await job.updateProgress({ stage: "Reading document content", percent: 15 });

      const rawText = await extractText(buffer, resource.mimeType);
      const text = cleanAndChunk(rawText);

      await job.updateProgress({ stage: "Analysing content", percent: 25 });

      const generator = GENERATORS[type];
      const outputData = await generator(text, resource, job);

      await prisma.studyTool.update({
        where: { id: toolId },
        data: {
          status: "READY",
          outputJson: JSON.stringify(outputData),
          generatedAt: new Date(),
          errorMessage: null,
        },
      });

      await job.updateProgress({ stage: "Done", percent: 100 });

      return { toolId, type, status: "READY" };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";

      console.error(`[StudyToolWorker] Job ${job.id} failed for tool ${toolId}:`, message);

      await prisma.studyTool.update({
        where: { id: toolId },
        data: {
          status: "FAILED",
          errorMessage: message.slice(0, 500),
        },
      });

      throw error;
    }
  },
  {
    connection: { url: process.env.UPSTASH_REDIS_URL! },
    concurrency: 3,
  }
);

worker.on("failed", (job, err) => {
  console.error(`[StudyToolWorker] Job ${job?.id} permanently failed:`, err.message);
});

worker.on("completed", (job) => {
  console.log(`[StudyToolWorker] Job ${job.id} completed for type: ${job.data.type}`);
});
