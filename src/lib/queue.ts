import { Queue } from "bullmq";
import { redisConnection } from "./redis";

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
  trackId: string;
  mbid?: string;
  userId?: string;
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

export const lastfmQueue = new Queue("lastfm", {
  connection: redisConnection,
});

export type MergeJobData = { a: string; b: string };

export const mergeQueue = new Queue<MergeJobData>("track-merge", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const sweepQueue = new Queue("track-sweep", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 50 },
  },
});

export const dedupeQueue = new Queue("dedupe-history", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 50 },
  },
});
