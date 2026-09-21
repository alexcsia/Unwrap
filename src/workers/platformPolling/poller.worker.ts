import type { pollerData } from "../types";
import { Worker } from "bullmq";
import { redisConnection } from "@/lib/queue";
import { processPlatformPolling } from "./processPlatformPolling";

const worker = new Worker<pollerData>(
  "platform-poll",
  processPlatformPolling,

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

worker.on("completed", (job) =>
  console.log(`[Poller] Job ${job.id} completed`),
);
worker.on("failed", (job, err) =>
  console.error(`[Poller] Job ${job?.id} failed: ${err.message}`),
);
worker.on("error", (err) => console.error(`[Poller] Connection error:`, err));
