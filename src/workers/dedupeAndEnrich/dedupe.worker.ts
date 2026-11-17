import { Worker } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { dedupeQueue } from "@/lib/queue";
import { dedupeUserHistory } from "./dedupe";

export const dedupeWorker = new Worker(
  dedupeQueue.name,
  async (job) => {
    await dedupeUserHistory(job.data.userId);
  },
  { connection: redisConnection, concurrency: 2 },
);

dedupeWorker.on("completed", (job) => {
  console.log(`[Dedupe] Job ${job.id} completed`);
});

dedupeWorker.on("failed", (job, err) => {
  console.error(`[Dedupe] Job ${job?.id} failed: ${err.message}`);
});

dedupeWorker.on("error", (err) => {
  console.error("[Dedupe] Worker error:", err);
});

export const enqueueDedupe = (userId: string) =>
  dedupeQueue.add(
    "dedupe-history",
    { userId },
    {
      jobId: `dedupe-${userId}`,
      removeOnComplete: true,
      removeOnFail: { age: 3600 },
    },
  );
