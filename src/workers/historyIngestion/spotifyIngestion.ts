import workerUtils from "../shared";
import { redisCache } from "@/lib/queue";
import * as ingestionHelpers from "./helpers";
import { getPlatformConnection } from "@/models/connectedPlatforms.model";
import type { UploadArtist, UploadData } from "../types";
import type { IngestionResult } from "./types";

export async function spotifyIngestion(
  userId: string,
  entry: UploadData,
): Promise<IngestionResult> {
  const lockKey = `lock:track:${entry.platformTrackId}`;
  let lockAcquired = false;

  try {
    const isPending = entry.artists.some((artist: UploadArtist) =>
      artist.platformId.startsWith("pending:"),
    );

    const connection = await getPlatformConnection(userId, "spotify");

    let resolvedArtists = entry.artists;

    if (isPending && connection) {
      const cacheKey = `spotify:track:${entry.platformTrackId}:artists`;

      const cached = await redisCache.get(cacheKey);

      if (cached) {
        await redisCache.expire(cacheKey, workerUtils.rateLimits.CACHE_TTL_SEC);

        resolvedArtists = JSON.parse(cached);
      } else {
        const acquired = await workerUtils.locks.acquireEnrichmentLock(lockKey);

        if (!acquired) {
          return { status: "retry" };
        }

        lockAcquired = true;

        try {
          resolvedArtists = await ingestionHelpers.fetchAndCacheSpotifyArtists(
            entry,
            connection,
            cacheKey,
          );
        } catch (error: any) {
          console.warn(
            `Spotify enrichment failed: ${error.message}. ` +
              "Saving with pending artists.",
          );

          resolvedArtists = entry.artists;
        }
      }
    }

    const { track, listeningHistory, artists } = ingestionHelpers.toSpotifyDTOs(
      entry,
      resolvedArtists,
    );

    await ingestionHelpers.saveHistoryRecords(
      track,
      artists,
      listeningHistory,
      entry,
      userId,
    );
    return { status: "completed" };
  } finally {
    await redisCache.del(lockKey).catch((error) => {
      console.error(
        `Failed to release poller lock for ${userId}: ${error.message}`,
      );
    });
  }
}
