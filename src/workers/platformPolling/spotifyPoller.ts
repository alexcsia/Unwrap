import { fetchRecentTracks } from "@/platforms/spotify/utils";
import { redisCache } from "@/lib/redis";
import { findOrCreateArtist } from "@/models/artist.model";
import { connectArtistsAndTrack } from "@/models/track.model";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import prisma from "@/utils/prisma.util";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";
import { CURSOR_TTL } from "./processPlatformPolling";
import pLimit from "p-limit";
import {
  findOrCreateTrackByIdentifiers,
  findOrCreateArtistByIdentifiers,
} from "./lastfmPoller";

export type SpotifyPollerDeps = {
  fetchRecentTracks: typeof fetchRecentTracks;
  cache: {
    set: typeof redisCache.set;
    get: typeof redisCache.get;
    del: typeof redisCache.del;
  };
  // findOrCreateTrack: typeof findOrCreateTrack;
  findOrCreateArtist: typeof findOrCreateArtist;
  connectArtistsAndTrack: typeof connectArtistsAndTrack;
  saveListeningHistory: typeof saveListeningHistory;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
};

const defaultPollerDeps: SpotifyPollerDeps = {
  fetchRecentTracks: fetchRecentTracks,
  cache: {
    set: redisCache.set.bind(redisCache),
    get: redisCache.get.bind(redisCache),
    del: redisCache.del.bind(redisCache),
  },
  // findOrCreateTrack: findOrCreateTrack,
  findOrCreateArtist: findOrCreateArtist,
  connectArtistsAndTrack: connectArtistsAndTrack,
  saveListeningHistory: saveListeningHistory,
  transaction: (fn) => prisma.$transaction(fn) as any,
};

// fix locking logic race condition

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

      const limit = pLimit(5);

      await Promise.all(
        tracks.map((entry) =>
          limit(() =>
            deps.transaction(async () => {
              const trackIdentifiers = entry.isrc
                ? [{ type: "ISRC" as const, value: entry.isrc }]
                : [];
              const savedTrack = await findOrCreateTrackByIdentifiers({
                trackName: entry.trackName,
                albumName: entry.albumName,
                durationMs: entry.durationMs ?? null,
                platformName: "spotify",
                platformTrackId: entry.platformTrackId,
                trackIdentifiers,
              });

              if (!savedTrack) {
                throw new Error(
                  `Failed to find or create track: ${entry.trackName}`,
                );
              }

              const artistIdentifiers = entry.isrc
                ? [{ type: "ISRC" as const, value: entry.isrc }]
                : [];

              const savedArtists = await findOrCreateArtistByIdentifiers({
                artists: entry.artists.map((a) => ({
                  artistName: a.name,
                  platformArtistId: a.platformId,
                  platformName: "spotify",
                  artistIdentifiers: [],
                })),
              });
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
            }),
          ),
        ),
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
