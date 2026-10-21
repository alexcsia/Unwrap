import { Worker } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { musicBrainzQueue } from "@/lib/queue";
import { MBProcessor, MusicBrainzRateLimitError } from "./processor";

const processor = MBProcessor();

export const musicBrainzWorker = new Worker(
  musicBrainzQueue.name,

  async (job) => {
    try {
      return processor(job);
    } catch (err) {
      if (err instanceof MusicBrainzRateLimitError) {
        await musicBrainzQueue.rateLimit(err.retryAfterMs);
        throw Worker.RateLimitError();
      }
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

musicBrainzWorker.on("completed", (job) => {
  console.log(`[MusicBrainz] Job ${job.id} completed`);
});

musicBrainzWorker.on("failed", (job, err) => {
  console.error(`[MusicBrainz] Job ${job?.id} failed: ${err.message}`);
});

musicBrainzWorker.on("error", (err) => {
  console.error("[MusicBrainz] Worker error:", err);
});
