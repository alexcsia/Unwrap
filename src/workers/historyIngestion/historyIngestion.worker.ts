import { Worker } from "bullmq";
import type { HistoryIngestionJobData } from "../types";
import { redisConnection } from "@/lib/redis";
import { createHistoryIngestionProcessor } from "./processHistoryIngestion";

/**
 * Service: history-sync Worker
 *
 * Background worker that processes and enriches listening history entries from a BullMQ queue.
 *
 * Flow:
 * -  Extracts and formats raw job data into a standardized ListeningHistoryDTO.
 * - Identifies entries missing platform-specific Artist IDs (common in file uploads).
 * - Checks Redis for cached artist IDs to minimize Spotify API calls.
 * - Spotify Enrichment: Fetches missing Artist IDs from Spotify API if not cached.
 *
 * Configuration:
 * - Rate limited to 10 jobs per second to respect Spotify API quotas.
 * - Retains a history of 100 completed and 500 failed jobs for monitoring.
 *
 * Errors:
 * - Moves job to "Delayed" state on API rate limits.
 * - Throws fatal errors for database failures, triggering BullMQ's automatic retry logic.
 */

export const historyWorker = new Worker<HistoryIngestionJobData>(
  "history-ingestion",
  createHistoryIngestionProcessor(),
  {
    connection: redisConnection,
    limiter: {
      max: 10,
      duration: 1000,
    },
    lockDuration: 60000,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

historyWorker.on("completed", (job) =>
  console.log(`[Worker] Job ${job.id} completed`),
);
historyWorker.on("failed", (job, err) =>
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`),
);
historyWorker.on("error", (err) =>
  console.error(`[Worker] Connection error:`, err),
);
