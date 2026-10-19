import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import type { TrackToEnrich } from "@/workers/musicBrainzEnrichment/processor";

export const historyQueue = new Queue("history-ingestion", {
  connection: redisConnection,
});
export const deleteQueue = new Queue("delete-user", {
  connection: redisConnection,
});
export const pollQueue = new Queue("platform-poll", {
  connection: redisConnection,
});

export type MusicBrainzJobData = {
  track: TrackToEnrich;
};

export const musicBrainzQueue = new Queue<MusicBrainzJobData>("musicbrainz", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
