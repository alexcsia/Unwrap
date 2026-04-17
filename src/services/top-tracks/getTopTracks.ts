import prisma from "@/utils/prisma.util";

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

  // Fetch all exclusions for this user
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
    // 1. Exclude blocked tracks
    platformTrackId: { notIn: excludedTrackIds },
    // 2. Exclude tracks where ANY artist is blocked
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

  // Updated count query to respect exclusions
  const totalResultRaw = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(DISTINCT lh."platformTrackId") as count
  FROM "ListeningHistory" lh
  WHERE lh."userId" = ${userId}
    AND lh."playedAt" >= ${startDate}
    AND lh."playedAt" < ${endDate}
    -- Exclude tracks
    AND lh."platformTrackId" NOT IN (
      SELECT "targetId" FROM "Exclusion" WHERE "userId" = ${userId} AND "type" = 'track'
    )
    -- Exclude tracks by blocked artists
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
