import prisma from "@/utils/prisma.util";
import type { SpotifyTrackDTO } from "@/platforms/spotify/types";
import type { Track, Artist } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const findOrCreateTrack = async (
  track: SpotifyTrackDTO,
  platformName: string,
): Promise<Track> => {
  try {
    const existingPlatformTrack = await prisma.platformTrack.findUnique({
      where: {
        platformName_platformTrackId: {
          platformName,
          platformTrackId: track.platformTrackId,
        },
      },
      include: {
        track: true,
      },
    });

    if (existingPlatformTrack) {
      return existingPlatformTrack.track;
    }

    if (track.isrc) {
      const existingTrack = await prisma.track.findUnique({
        where: {
          isrc: track.isrc,
        },
      });

      if (existingTrack) {
        await prisma.platformTrack.create({
          data: {
            trackId: existingTrack.id,
            platformName,
            platformTrackId: track.platformTrackId,
          },
        });

        return existingTrack;
      }
    }

    const newTrack = await prisma.track.create({
      data: {
        trackName: track.trackName,
        albumName: track.albumName,
        durationMs: track.durationMs,
        metadata: {},
        isrc: track.isrc,
        platformTracks: {
          create: {
            platformName,
            platformTrackId: track.platformTrackId,
          },
        },
      },
    });

    return newTrack;
  } catch (error: any) {
    if (error.code === "P2002") {
      return findOrCreateTrack(track, platformName);
    }
    throw error;
  }
};

export const connectArtistsAndTrack = async (
  savedTrackEntry: Track,
  savedArtistEntry: Artist[],
) => {
  await prisma.track.update({
    where: { id: savedTrackEntry!.id },
    data: {
      artists: {
        connect: savedArtistEntry.map((a) => ({ id: a.id })),
      },
    },
  });
};

export type TopTrackRow = {
  trackId: string;
  trackName: string;
  albumName: string;
  playCount: bigint;
  durationMs: bigint;
  totalCount: bigint;
  artistNames: string;
};

export type FindTopTracksParams = {
  userId: string;
  start: Date;
  end: Date;
  excludedTrackIds: string[];
  excludedArtistIds: string[];
  limit: number;
  offset: number;
};

export const findTopTracks = ({
  userId,
  start,
  end,
  excludedTrackIds,
  excludedArtistIds,
  limit,
  offset,
}: FindTopTracksParams): Promise<TopTrackRow[]> =>
  prisma.$queryRaw<TopTrackRow[]>`
    SELECT 
      t.id AS "trackId",
      t."trackName",
      t."albumName",
      COUNT(lh.id) AS "playCount",
      t."durationMs",
      COUNT(*) OVER() AS "totalCount",
      COALESCE(STRING_AGG(DISTINCT a.name, ', '), '') AS "artistNames"
    FROM "ListeningHistory" lh
    JOIN "Track" t ON t.id = lh."trackId"
    JOIN "_TrackArtists" ta ON ta."B" = t.id
    JOIN "Artist" a ON a.id = ta."A"
    WHERE lh."userId" = ${userId}
      AND lh."playedAt" >= ${start}
      AND lh."playedAt" < ${end}
      ${
        excludedTrackIds.length
          ? Prisma.sql`AND t.id NOT IN (${Prisma.join(excludedTrackIds)})`
          : Prisma.empty
      }
      ${
        excludedArtistIds.length
          ? Prisma.sql`
            AND NOT EXISTS (
              SELECT 1
              FROM "_TrackArtists" ta2
              JOIN "Artist" a2 ON a2.id = ta2."B"
              WHERE ta2."A" = t.id
                AND a2.id = ANY(${excludedArtistIds}::uuid[])
            )
          `
          : Prisma.empty
      }
    GROUP BY t.id, t."trackName", t."albumName", t."durationMs"
    ORDER BY COUNT(lh.id) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
