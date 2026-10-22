import { Job } from "bullmq";
import { redisCache } from "@/lib/redis";
import { getLastfmTrackDuration } from "./fetchTrackDuration";
import { updateTrackWithDuration } from "@/models/track";
import { needsIdentifierEnrichment } from "@/models/trackIdentifier.model";
import { musicBrainzQueue } from "@/lib/queue";
import { findTrack } from "@/models/track";
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
  trackId: string;
};

export const createLastfmProcessor = (deps = defaultDeps) => {
  return async (job: Job<LastfmJobData>) => {
    const { trackId } = job.data;

    const track = await findTrack(trackId);
    if (!track) return;
    const res = await getLastfmTrackDuration(track, deps);

    const seconds = res.track.duration;
    if (!seconds) return;

    const updated = await updateTrackWithDuration(trackId, res.track.duration);

    if (!(await needsIdentifierEnrichment(job.data.trackId))) return;

    const mbid = updated?.identifiers[0]?.value;

    if (mbid) {
      await musicBrainzQueue.add(
        "fetch-isrcs",
        { trackId: trackId, mbid },
        { jobId: `isrc-${mbid}` },
      );
    } else {
      await musicBrainzQueue.add(
        "fuzzy-search",
        { trackId: trackId },
        { jobId: `fuzzy-${trackId}` },
      );
    }
  };
};

export const lastfmProcessor = createLastfmProcessor();
