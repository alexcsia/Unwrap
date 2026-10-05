import type { pollerData } from "../types";
import { Worker } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { createPlatformPollingProcessor } from "./processPlatformPolling";

export const pollerWorker = new Worker<pollerData>(
  "platform-poll",
  createPlatformPollingProcessor(),

  {
    concurrency: 5,
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

pollerWorker.on("completed", (job) =>
  console.log(`[Poller] Job ${job.id} completed`),
);
pollerWorker.on("failed", (job, err) =>
  console.error(`[Poller] Job ${job?.id} failed: ${err.message}`),
);
pollerWorker.on("error", (err) =>
  console.error(`[Poller] Connection error:`, err),
);
