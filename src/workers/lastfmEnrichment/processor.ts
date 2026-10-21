import type { LastFmTrack } from "../platformPolling/lastfm/types";
import { Job } from "bullmq";
import { redisCache } from "@/lib/redis";
import { getLastfmTrackDuration } from "./fetchTrackDuration";
import prisma from "@/utils/prisma.util";
import { needsEnrichment } from "@/models/trackIdentifier.model";
import { musicBrainzQueue } from "@/lib/queue";
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

if (!LASTFM_API_KEY) {
  throw new Error("Lastfm API key missing");
}
export type lastfmEnrichmentDeps = {
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };
  fetch: typeof fetch;
  LASTFM_API_KEY: string;
};

const defaultDeps: lastfmEnrichmentDeps = {
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },
  fetch: fetch.bind(globalThis),
  LASTFM_API_KEY: LASTFM_API_KEY,
};

export type LastfmJobData = {
  lastfmTrack: LastFmTrack;
  savedTrackId: string;
};

export const createLastfmProcessor = (deps = defaultDeps) => {
  return async (job: Job<LastfmJobData>) => {
    const { savedTrackId, lastfmTrack } = job.data;

    const res = await getLastfmTrackDuration(lastfmTrack, deps);

    const seconds = res.track.duration;
    if (!seconds) return;

    await updateTrackWithDuration(savedTrackId, res.track.duration);

    if (await needsEnrichment(savedTrackId)) {
      await musicBrainzQueue.add(
        "fuzzy-search",
        { trackId: savedTrackId },
        { jobId: `fuzzy-${savedTrackId}` },
      );
    }
  };
};

export const lastfmProcessor = createLastfmProcessor();

export const updateTrackWithDuration = async (
  trackId: string,
  seconds: string,
) => {
  await prisma.track.update({
    where: { id: trackId },
    data: {
      durationMs: Number(seconds) * 1000,
    },
  });
};
