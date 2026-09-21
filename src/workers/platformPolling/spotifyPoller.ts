import { fetchRecentTracks } from "@/platforms/spotify/utils";
import { redisCache } from "@/lib/queue";
import { getPlatformConnection } from "@/models/connectedPlatforms.model";
import { findOrCreateArtist } from "@/models/artist.model";
import {
  connectArtistsAndTrack,
  findOrCreateTrack,
} from "@/models/track.model";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import prisma from "@/utils/prisma.util";
import type { UserConnectedPlatforms } from "@/services/listeningHistory/types";

const CURSOR_TTL = 7 * 24 * 60 * 60; // 7 days

export async function spotifyPoller(
  userConnectedPlatforms: UserConnectedPlatforms,
) {
  const lockKey = `spotify-poll-lock:${userConnectedPlatforms.userId}`;
  const lock = await redisCache.set(lockKey, "1", "EX", 25 * 60, "NX");

  if (!lock) {
    console.log(
      `Poller job for ${userConnectedPlatforms.userId} already running `,
    );
    return;
  }

  try {
    const connection = await getPlatformConnection(
      userConnectedPlatforms.userId,
      "spotify",
    );
    if (!connection) return;

    // fetch only tracks newer than last cursor
    const cursorKey = `spotify-cursor:${userConnectedPlatforms.userId}`;
    const cursor = await redisCache.get(cursorKey);

    const tracks = await fetchRecentTracks(
      userConnectedPlatforms,
      cursor ?? undefined,
    );
    if (tracks.length === 0) {
      console.log(`No new tracks for ${userConnectedPlatforms.userId}`);
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
            userConnectedPlatforms.userId,
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
        `Failed to release poller lock for ${userConnectedPlatforms.userId}: ${error.message}`,
      );
    });
  }
}
