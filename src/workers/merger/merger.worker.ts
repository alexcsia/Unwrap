import { Worker } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { mergeQueue } from "@/lib/queue";
import { processMerge } from "./processor";

export const mergeWorker = new Worker(
  mergeQueue.name,

  async (job) => {
    try {
      return processMerge(job.data);
    } catch (err) {
      console.log(err);
      throw err;
    }
  },

  {
    connection: redisConnection,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 1_100,
    },
    lockDuration: 60_000,
  },
);

mergeWorker.on("completed", (job) => {
  console.log(`[Merge] Job ${job.id} completed`);
});

mergeWorker.on("failed", (job, err) => {
  console.error(`[Merge] Job ${job?.id} failed: ${err.message}`);
});

mergeWorker.on("error", (err) => {
  console.error("[Merge] Worker error:", err);
});
