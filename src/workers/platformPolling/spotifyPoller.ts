import { fetchRecentTracks } from "@/platforms/spotify/utils";
import { redisCache } from "@/lib/redis";
import { findOrCreateArtist } from "@/models/artist.model";
import {
  connectArtistsAndTrack,
  findOrCreateTrack,
} from "@/models/track.model";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import prisma from "@/utils/prisma.util";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";

const CURSOR_TTL = 7 * 24 * 60 * 60; // 7 days

export type SpotifyPollerDeps = {
  fetchRecentTracks: typeof fetchRecentTracks;
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };
  findOrCreateTrack: typeof findOrCreateTrack;
  findOrCreateArtist: typeof findOrCreateArtist;
  connectArtistsAndTrack: typeof connectArtistsAndTrack;
  saveListeningHistory: typeof saveListeningHistory;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
};

const defaultPollerDeps: SpotifyPollerDeps = {
  fetchRecentTracks: fetchRecentTracks,
  cache: {
    set: redisCache.set,
    get: redisCache.get,
    del: redisCache.del,
  },
  findOrCreateTrack: findOrCreateTrack,
  findOrCreateArtist: findOrCreateArtist,
  connectArtistsAndTrack: connectArtistsAndTrack,
  saveListeningHistory: saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn) as any,
};

export const createSpotifyPoller = (deps = defaultPollerDeps) =>
  async function spotifyPoller(connection: SpotifyConnection) {
    const lockKey = `spotify-poll-lock:${connection.userId}`;
    const lock = await deps.cache.set(lockKey, "1", "EX", 25 * 60, "NX");

    if (!lock) {
      console.log(`Poller job for ${connection.userId} already running `);
      return;
    }

    try {
      const cursorKey = `spotify-cursor:${connection.userId}`;
      const cursor = await deps.cache.get(cursorKey);

      const tracks = await deps.fetchRecentTracks(
        connection,
        cursor ?? undefined,
      );
      if (tracks.length === 0) {
        console.log(`No new tracks for ${connection.userId}`);
        return;
      }

      await Promise.all(
        tracks.map(async (entry) => {
          return deps.transaction(async () => {
            const savedTrack = await deps.findOrCreateTrack(
              entry,
              entry.platformName,
            );

            if (!savedTrack) {
              throw new Error(
                `Failed to find or create track: ${entry.trackName}`,
              );
            }
            const savedArtists = await deps.findOrCreateArtist(
              entry.artists,
              entry.platformName,
            );
            await deps.connectArtistsAndTrack(savedTrack, savedArtists);
            await deps.saveListeningHistory(
              {
                platformName: entry.platformName,
                playedAt: entry.playedAt,
                source: entry.source,
                uploadedAt: entry.uploadedAt,
              },
              savedTrack.id,
              connection.userId,
            );
          });
        }),
      );

      const latestPlayedAt = tracks[0]?.playedAt;
      await deps.cache.set(
        cursorKey,
        new Date(latestPlayedAt!).getTime().toString(),
        "EX",
        CURSOR_TTL,
      );
    } finally {
      await deps.cache.del(lockKey).catch((error) => {
        console.error(
          `Failed to release poller lock for ${connection.userId}: ${error.message}`,
        );
      });
    }
  };

export const spotifyPoller = createSpotifyPoller();
