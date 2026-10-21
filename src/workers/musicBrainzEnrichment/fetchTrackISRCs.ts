import type { TrackToEnrich, MusicBrainzEnrichmentDeps } from "./processor";

import { mbFetch, MusicBrainzNotFoundError } from "./processor";
import prisma from "@/utils/prisma.util";

export const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";

export const ISRC_CACHE_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
export const NEGATIVE_CACHE_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export const fetchTrackISRCs = async (
  trackId: string,
  mbid: string,
  deps: MusicBrainzEnrichmentDeps,
) => {
  const cached = await deps.cache.get(isrcCacheKey(mbid));

  if (cached) {
    const isrcs = JSON.parse(cached) as unknown as string[];
    await deps.saveIdentifiers(trackId, mbid, isrcs);
    return;
  }

  try {
    const recording = await mbFetch(
      `${deps.MUSICBRAINZ_BASE}/recording/${mbid}?inc=isrcs&fmt=json`,
      deps,
    );

    console.log("found a track:", recording);
    if (recording?.length) {
      await prisma.track.updateMany({
        where: {
          id: trackId,
          OR: [{ durationMs: undefined }, { durationMs: 0 }],
        },
        data: { durationMs: recording.length },
      });
    }

    const isrcs: string[] = Array.isArray(recording?.isrcs)
      ? recording.isrcs
      : [];

    await deps.saveIdentifiers(trackId, mbid, isrcs);

    const ttl = isrcs.length > 0 ? ISRC_CACHE_TTL_SEC : NEGATIVE_CACHE_TTL_SEC;
    await deps.cache.set(isrcCacheKey(mbid), JSON.stringify(isrcs), "EX", ttl);
  } catch (err) {
    if (err instanceof MusicBrainzNotFoundError)
      await deps.cache.set(
        isrcCacheKey(mbid),
        JSON.stringify([]),
        "EX",
        NEGATIVE_CACHE_TTL_SEC,
      );
    throw err;
  }
};

export const isrcCacheKey = (mbid: string) => `mb:recording:${mbid}:isrcs`;
