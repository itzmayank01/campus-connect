/**
 * @file queue.ts
 * @description BullMQ queue singleton for StudyLab tool generation jobs.
 * Uses UPSTASH_REDIS_URL (standard Redis protocol) — NOT the REST API.
 */

import { Queue } from "bullmq";

const connection = {
  url: process.env.UPSTASH_REDIS_URL || "",
};

/** Shared BullMQ queue for all study tool generation jobs. */
export const studyToolQueue = new Queue("study-tools", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
