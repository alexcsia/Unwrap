import type { Artist } from "@prisma/client";
import prisma from "@/utils/prisma.util";

type ArtistInput = {
  name: string;
  platformId: string;
  genres?: string[];
  imageUrl?: string;
};

export const findOrCreateArtist = async (
  artists: ArtistInput[],
  platform: string,
): Promise<Artist[]> => {
  try {
    const results = await Promise.all(
      artists.map(async (artist) => {
        const existing = await prisma.platformArtist.findUnique({
          where: {
            platformArtistId_platformName: {
              platformName: platform,
              platformArtistId: artist.platformId,
            },
          },
          include: { artist: true },
        });

        if (existing) return existing.artist;

        return prisma.artist.create({
          data: {
            name: artist.name,
            imageUrl: artist.imageUrl,
            genres: artist.genres,
            platformArtists: {
              create: {
                platformName: platform,
                platformArtistId: artist.platformId,
              },
            },
          },
        });
      }),
    );

    return results;
  } catch (error: any) {
    if (error.code === "P2002") {
      return findOrCreateArtist(artists, platform);
    }
    throw error;
  }
};

export type TopArtistRow = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  playCount: bigint;
  totalDurationMs: bigint;
  totalCount: bigint;
};

export type FindTopArtistsParams = {
  userId: string;
  start: Date;
  end: Date;
  limit: number;
  offset: number;
};

export const findTopArtists = ({
  userId,
  start,
  end,
  limit,
  offset,
}: FindTopArtistsParams): Promise<TopArtistRow[]> =>
  prisma.$queryRaw<TopArtistRow[]>`
    SELECT 
      a.id AS "artistId",
      a.name AS "artistName",
      a."imageUrl",
      COUNT(lh.id) AS "playCount",
      SUM(t."durationMs") AS "totalDurationMs",
      COUNT(*) OVER() AS "totalCount"
    FROM "ListeningHistory" lh
    JOIN "Track" t ON t.id = lh."trackId"
    JOIN "_TrackArtists" ta ON ta."B" = t.id
    JOIN "Artist" a ON a.id = ta."A"
    WHERE lh."userId" = ${userId}
      AND lh."playedAt" >= ${start}
      AND lh."playedAt" < ${end}
      AND a.id NOT IN (
        SELECT "targetId"
        FROM "Exclusion"
        WHERE "userId" = ${userId}
          AND "type" = 'artist'
      )
    GROUP BY a.id, a.name, a."imageUrl"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
