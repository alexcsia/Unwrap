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

export async function spotifyPoller(connection: SpotifyConnection) {
  const lockKey = `spotify-poll-lock:${connection.userId}`;
  const lock = await redisCache.set(lockKey, "1", "EX", 25 * 60, "NX");

  if (!lock) {
    console.log(`Poller job for ${connection.userId} already running `);
    return;
  }

  try {
    // fetch only tracks newer than last cursor
    const cursorKey = `spotify-cursor:${connection.userId}`;
    const cursor = await redisCache.get(cursorKey);

    const tracks = await fetchRecentTracks(connection, cursor ?? undefined);
    if (tracks.length === 0) {
      console.log(`No new tracks for ${connection.userId}`);
      return;
    }

    await Promise.all(
      tracks.map(async (entry) => {
        return prisma.$transaction(async () => {
          const savedTrack = await findOrCreateTrack(entry, entry.platformName);

          if (!savedTrack) {
            throw new Error(
              `Failed to find or create track: ${entry.trackName}`,
            );
          }
          const savedArtists = await findOrCreateArtist(
            entry.artists,
            entry.platformName,
          );
          await connectArtistsAndTrack(savedTrack, savedArtists);
          await saveListeningHistory(
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
    await redisCache.set(
      cursorKey,
      new Date(latestPlayedAt!).getTime().toString(),
      "EX",
      CURSOR_TTL,
    );
  } finally {
    await redisCache.del(lockKey).catch((error) => {
      console.error(
        `Failed to release poller lock for ${connection.userId}: ${error.message}`,
      );
    });
  }
}
