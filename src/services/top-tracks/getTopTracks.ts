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

  const whereClause = {
    userId,
    playedAt: { gte: startDate, lt: endDate },
  };

  const topTracksQuery = await prisma.listeningHistory.groupBy({
    by: ["platformTrackId", "trackName", "albumName", "source"],
    where: whereClause,
    _count: { platformTrackId: true },
    _max: { durationMs: true },
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

  const result = await prisma.$queryRaw<{ count: number }[]>`
  SELECT COUNT(DISTINCT "platformTrackId") as count
  FROM "ListeningHistory"
  WHERE "userId" = ${userId}
  AND "playedAt" >= ${startDate}
  AND "playedAt" < ${endDate}
`;

  const total = Number(result[0]?.count ?? 0);

  const topTracks = topTracksQuery.map((track, index) => ({
    rank: offset + index + 1,
    trackId: track.platformTrackId,
    trackName: track.trackName,
    artistName: (artistMap.get(track.platformTrackId) || []).join(", "),
    albumName: track.albumName,
    plays: track._count.platformTrackId,
    durationMs: track._max.durationMs,
    source: track.source,
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
