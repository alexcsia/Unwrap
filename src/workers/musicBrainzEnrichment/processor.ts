import type { Job } from "bullmq";
import { fuzzySearchHandler } from "./fuzzySearch";
import { fetchTrackISRCs } from "./fetchTrackISRCs";
import { redisCache } from "@/lib/redis";
import { pickBestMatch } from "./fuzzySearch";
import prisma from "@/utils/prisma.util";
import { UnrecoverableError } from "bullmq";

export class MusicBrainzNotFoundError extends UnrecoverableError {
  constructor(public readonly url: string) {
    super(`MusicBrainz recording not found: ${url}`);
  }
}

export class MusicBrainzRateLimitError extends UnrecoverableError {
  constructor(
    public readonly retryAfterMs: number,
    url: string,
  ) {
    super(`MusicBrainz rate limited: ${url}`);
  }
}

export const MUSICBRAINZ_USER_AGENT = "UnwrapApp/1.0.0 (alexiutttt@gmail.com)";
const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";

const ISRC_CACHE_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
const NEGATIVE_CACHE_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export type MusicBrainzJobData = {
  track: TrackToEnrich;
};

export const saveIdentifiers = async (
  trackId: string,
  mbid: string,
  isrcs: string[],
) => {
  try {
    await prisma.trackIdentifier.createMany({
      data: [
        { trackId, type: "MBID" as const, value: mbid, source: "musicbrainz" },
        ...isrcs.map((v) => ({
          trackId,
          type: "ISRC" as const,
          value: v,
          source: "musicbrainz",
        })),
      ],
      skipDuplicates: true,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      console.warn(
        `[identifiers] Unique constraint violation for track ${trackId} (merge candidate)`,
      );
      return;
    }
    throw error;
  }
};

export const markSearchFailed = async (trackId: string) => {
  await redisCache.set(
    `enrichment:failed:${trackId}`,
    "1",
    "EX",
    NEGATIVE_CACHE_TTL_SEC,
  );
};

export type MusicBrainzEnrichmentDeps = {
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };
  fetch: typeof fetch;
  saveIdentifiers: typeof saveIdentifiers;
  markSearchFailed: typeof markSearchFailed;
  MUSICBRAINZ_USER_AGENT: string;
  MUSICBRAINZ_BASE: string;
  pickBestMatch: typeof pickBestMatch;
};

const mbDependencies: MusicBrainzEnrichmentDeps = {
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },
  fetch: fetch.bind(globalThis),
  saveIdentifiers: saveIdentifiers,
  markSearchFailed: markSearchFailed,
  MUSICBRAINZ_USER_AGENT: MUSICBRAINZ_USER_AGENT,
  MUSICBRAINZ_BASE: MUSICBRAINZ_BASE,
  pickBestMatch: pickBestMatch,
};

export type TrackToEnrich = {
  id: string;
  mbid: string | null;
  trackName: string;
  duration: number;
  artistsName: string[];
};

export const createProcessor = () => {
  return async (job: Job<MusicBrainzJobData>): Promise<void> => {
    switch (job.name) {
      case "fuzzy-search":
        await fuzzySearchHandler(job.data.track, mbDependencies);
        return;

      case "fetch-isrcs":
        await fetchTrackISRCs(job.data.track, mbDependencies);
        return;

      default:
        throw new Error(`Unknown MusicBrainz job: ${job.name}`);
    }
  };
};

export const MBProcessor = createProcessor;

export const mbFetch = async (
  url: string,
  deps: MusicBrainzEnrichmentDeps,
): Promise<any> => {
  const startedAt = Date.now();

  console.log(
    `[MB request] ${new Date().toISOString()} pid=${process.pid} url=${url}`,
  );
  const res = await deps.fetch(url, {
    headers: {
      "User-Agent": deps.MUSICBRAINZ_USER_AGENT,
      Accept: "application/json",
    },
  });

  console.log(
    `[MB response] status=${res.status} elapsed=${Date.now() - startedAt}ms url=${url}`,
  );

  if (res.status === 503) {
    const retryAfterSec = Number(res.headers.get("Retry-After"));
    const retryAfterMs =
      Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec * 1000
        : 10_000;
    throw new MusicBrainzRateLimitError(retryAfterMs, url);
  }

  if (res.status === 404) {
    throw new MusicBrainzNotFoundError(url);
  }

  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
    console.log("res", res);
    throw new UnrecoverableError(
      `MB client error ${res.status} — not retrying`,
    );
  }
  if (!res.ok) {
    throw new Error(`MusicBrainz request failed: ${res.status}`);
  }

  return await res.json();
};
