import prisma from "@/utils/prisma.util";

/**
 * Service: getTopTracksService
 *
 * Retrieves a ranked list of a user's most-played tracks within a specific timeframe,
 * filtering out tracks or artists based on user-defined exclusions.
 *
 * Flow:
 * - Normalizes date filters (year, month, custom range) into precise start and end boundaries.
 * - Fetches user exclusion lists for both "track" and "artist" types.
 * - Aggregates listening history using Prisma's `groupBy`, filtering by date and excluding
 * specific track IDs or tracks featuring excluded artists.
 * - Performs a secondary query to fetch artist names for the top tracks (since `groupBy`
 * does not support relation joins).
 * - Executes a raw SQL query to determine the total count of unique, non-excluded tracks
 * to provide accurate pagination metadata.
 *
 * Returns:
 * - pagination: Metadata including limits, offsets, total counts, and navigation states.
 * - topTracks: Array of track objects including rank, play count, artist names, and source metadata.
 *
 * Errors:
 * - 500 (inherited) if Prisma aggregation or the raw SQL count query fails.
 */

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

  const whereClause = {
    userId,
    playedAt: { gte: startDate, lt: endDate },

    platformTrackId: { notIn: excludedTrackIds },

    artists: {
      none: {
        platformId: { in: excludedArtistIds },
      },
    },
  };

  const topTracksQuery = await prisma.listeningHistory.groupBy({
    by: ["platformTrackId", "trackName", "albumName", "source"],
    where: whereClause,
    _count: { platformTrackId: true },
    _max: { durationMs: true, uploadedAt: true },
    orderBy: { _count: { platformTrackId: "desc" } },
    take: limit,
    skip: offset,
  });

  const trackIds = topTracksQuery.map((t) => t.platformTrackId);

  const tracksWithArtists = await prisma.listeningHistory.findMany({
    where: {
      platformTrackId: { in: trackIds },
    },
    select: {
      platformTrackId: true,
      artists: { select: { name: true } },
    },
    distinct: ["platformTrackId"],
  });

  const artistMap = new Map(
    tracksWithArtists.map((t) => [
      t.platformTrackId,
      t.artists.map((a) => a.name),
    ]),
  );

  const totalResultRaw = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(DISTINCT lh."platformTrackId") as count
  FROM "ListeningHistory" lh
  WHERE lh."userId" = ${userId}
    AND lh."playedAt" >= ${startDate}
    AND lh."playedAt" < ${endDate}
    
    AND lh."platformTrackId" NOT IN (
      SELECT "targetId" FROM "Exclusion" WHERE "userId" = ${userId} AND "type" = 'track'
    )
    
    AND NOT EXISTS (
      SELECT 1 FROM "_TrackArtists" ta
      JOIN "Artist" a ON a.id = ta."A"
      WHERE ta."B" = lh.id
      AND a."platformId" IN (
        SELECT "targetId" FROM "Exclusion" WHERE "userId" = ${userId} AND "type" = 'artist'
      )
    )
`;

  const total = Number(totalResultRaw[0]?.count ?? 0);

  const topTracks = topTracksQuery.map((track, index) => ({
    rank: offset + index + 1,
    trackId: track.platformTrackId,
    trackName: track.trackName,
    artistName: (artistMap.get(track.platformTrackId) || []).join(", "),
    albumName: track.albumName,
    plays: track._count.platformTrackId,
    durationMs: track._max.durationMs ?? 0,
    source: track.source,
    uploadedAt: track._max.uploadedAt?.toISOString() ?? "",
  }));

  return {
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
      previousOffset: offset - limit >= 0 ? offset - limit : null,
    },
    topTracks,
  };
};
