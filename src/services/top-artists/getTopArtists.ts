import prisma from "@/utils/prisma.util";

/**
 * Service: getTopArtistsService
 *
 * Retrieves a ranked list of a user's most-played artists within a specific timeframe,
 * accounting for user-defined exclusions.
 *
 * Flow:
 * - Normalizes date filters (year, month, custom range) into precise start and end boundaries.
 * - Executes a raw SQL query to join ListeningHistory, the many-to-many TrackArtists table, and Artist details.
 * - Aggregates data to calculate play counts and total duration per artist.
 * - Filters out artists currently on the user's exclusion list based on platform ID.
 * - Performs a second raw query to determine the total count of unique, non-excluded artists for pagination.
 *
 * Returns:
 * - pagination: Object containing limit, offset, total count, and navigation metadata (next/previous).
 * - topArtists: Array of artist objects including rank, play count, duration, and metadata.
 *
 * Errors:
 * - 500 (inherited) if raw SQL execution fails or database connection is interrupted.
 */

export const getTopArtistsService = async (userId: string, filters: any) => {
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

  const topArtistsRaw = await prisma.$queryRaw<
    {
      artistId: string;
      artistName: string;
      imageUrl: string | null;
      playCount: bigint;
      durationMs: bigint | null;
      source: string | null;
      uploadedAt: Date | null;
    }[]
  >`
  SELECT 
    a.id AS "artistId",
    a.name AS "artistName",
    a."imageUrl",
    COUNT(lh.id) AS "playCount",
    SUM(lh."durationMs") AS "durationMs",
    MIN(lh."source") AS "source",
    MAX(lh."uploadedAt") AS "uploadedAt"
  FROM "ListeningHistory" lh
  JOIN "_TrackArtists" ta ON ta."B" = lh.id
  JOIN "Artist" a ON a.id = ta."A"
  WHERE lh."userId" = ${userId}
    AND lh."playedAt" >= ${startDate}
    AND lh."playedAt" < ${endDate}
    AND a."platformId" NOT IN (
      SELECT "targetId" FROM "Exclusion" 
      WHERE "userId" = ${userId} AND "type" = 'artist'
    )
  GROUP BY a.id, a.name, a."imageUrl"
  ORDER BY "playCount" DESC
  LIMIT ${limit}
  OFFSET ${offset}
`;

  const topArtists = topArtistsRaw.map((artist) => ({
    ...artist,
    playCount: Number(artist.playCount),
    durationMs: Number(artist.durationMs ?? 0),
    source: artist.source ?? "unknown",
    uploadedAt: artist.uploadedAt
      ? artist.uploadedAt.toISOString()
      : new Date().toISOString(),
  }));

  // Total count also needs to reflect exclusions
  const totalResultRaw = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(DISTINCT a.id) as count
  FROM "ListeningHistory" lh
  JOIN "_TrackArtists" ta ON ta."B" = lh.id
  JOIN "Artist" a ON a.id = ta."A"
  WHERE lh."userId" = ${userId}
    AND lh."playedAt" >= ${startDate}
    AND lh."playedAt" < ${endDate}
    AND a."platformId" NOT IN (
      SELECT "targetId" FROM "Exclusion" 
      WHERE "userId" = ${userId} AND "type" = 'artist'
    )
`;

  const total = Number(totalResultRaw[0]?.count ?? 0);

  return {
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
      previousOffset: offset - limit >= 0 ? offset - limit : null,
    },
    topArtists: topArtists.map((artist, index) => ({
      rank: offset + index + 1,
      artistId: artist.artistId,
      artistName: artist.artistName,
      playCount: artist.playCount,
      durationMs: artist.durationMs,
      source: artist.source,
      uploadedAt: artist.uploadedAt,
    })),
  };
};
