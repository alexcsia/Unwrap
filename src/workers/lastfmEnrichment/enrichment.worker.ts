import { Worker, UnrecoverableError } from "bullmq";
import { redisConnection } from "@/lib/redis";
import { lastfmQueue } from "@/lib/queue";
import { lastfmProcessor } from "./processor";

export class LastfmNotFoundError extends UnrecoverableError {
  constructor(public readonly url: string) {
    super(`MusicBrainz recording not found: ${url}`);
  }
}

export class LastfmRateLimitError extends UnrecoverableError {
  constructor(
    public readonly retryAfterMs: number,
    url: string,
  ) {
    super(`MusicBrainz rate limited: ${url}`);
  }
}

const processor = lastfmProcessor;

export const lastfmWorker = new Worker(
  lastfmQueue.name,

  async (job) => {
    try {
      return processor(job);
    } catch (err) {
      if (err instanceof LastfmRateLimitError) {
        await lastfmQueue.rateLimit(err.retryAfterMs);
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

lastfmWorker.on("completed", (job) => {
  console.log(`[Lastfm] Job ${job.id} completed`);
});

lastfmWorker.on("failed", (job, err) => {
  console.error(`[Lastfm] Job ${job?.id} failed: ${err.message}`);
});

lastfmWorker.on("error", (err) => {
  console.error("[Lastfm] Worker error:", err);
});
