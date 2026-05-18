import prisma from "@/utils/prisma.util";
import { Prisma } from "@prisma/client";

export const getTopTracksService = async (userId: string, filters: any) => {
  const { year, month, date, from, to, limit = 10, offset = 0 } = filters;

  let startDate: Date;
  let endDate: Date;

  if (date) {
    startDate = new Date(date);
    endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
  } else if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);
  } else if (year) {
    startDate = new Date(year, month ? month - 1 : 0, 1);
    endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  } else {
    startDate = new Date(0);
    endDate = new Date();
  }

  const exclusions = await prisma.exclusion.findMany({
    where: { userId },
    select: { type: true, targetId: true },
  });

  const excludedTrackIds = exclusions
    .filter((e) => e.type === "track")
    .map((e) => e.targetId);
  const excludedArtistIds = exclusions
    .filter((e) => e.type === "artist")
    .map((e) => e.targetId);

  const result = await prisma.$queryRaw<
    {
      platformTrackId: string;
      trackName: string;
      albumName: string;
      source: string | null;
      playCount: bigint;
      durationMs: bigint | null;
      uploadedAt: Date | null;
      totalCount: bigint;
      artistNames: string;
    }[]
  >`
    SELECT 
      lh."platformTrackId",
      lh."trackName",
      lh."albumName",
      lh."source",
      COUNT(lh.id) AS "playCount",
      MAX(lh."durationMs") AS "durationMs",
      MAX(lh."uploadedAt") AS "uploadedAt",
      COUNT(*) OVER() AS "totalCount",
      COALESCE(STRING_AGG(DISTINCT a.name, ', '), '') AS "artistNames"
    FROM "ListeningHistory" lh
    LEFT JOIN "_TrackArtists" ta ON ta."B" = lh.id
    LEFT JOIN "Artist" a ON a.id = ta."A"
    WHERE lh."userId" = ${userId}
      AND lh."playedAt" >= ${startDate}
      AND lh."playedAt" < ${endDate}
      ${
        excludedTrackIds.length
          ? Prisma.sql`AND lh."platformTrackId" NOT IN (${Prisma.join(
              excludedTrackIds,
            )})`
          : Prisma.empty
      }
      ${
        excludedArtistIds.length
          ? Prisma.sql`
            AND NOT EXISTS (
              SELECT 1
              FROM "_TrackArtists" ta2
              JOIN "Artist" a2 ON a2.id = ta2."A"
              WHERE ta2."B" = lh.id
                AND a2."platformId" = ANY(${excludedArtistIds})
            )
          `
          : Prisma.empty
      }
    GROUP BY lh."platformTrackId", lh."trackName", lh."albumName", lh."source"
    ORDER BY COUNT(lh.id) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = Number(result[0]?.totalCount ?? 0);

  return {
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
      previousOffset: offset - limit >= 0 ? offset - limit : null,
    },
    topTracks: result.map((track, index) => ({
      rank: offset + index + 1,
      trackId: track.platformTrackId,
      trackName: track.trackName,
      artistName: track.artistNames,
      albumName: track.albumName,
      plays: Number(track.playCount),
      durationMs: Number(track.durationMs ?? 0),
      source: track.source ?? "",
      uploadedAt: track.uploadedAt?.toISOString() ?? "",
    })),
  };
};
