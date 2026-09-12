import prisma from "@/utils/prisma.util";

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

  const raw = await prisma.$queryRaw<
    {
      artistId: string;
      artistName: string;
      imageUrl: string | null;
      playCount: bigint;
      totalDurationMs: bigint;
      totalCount: bigint;
    }[]
  >`
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
    AND lh."playedAt" >= ${startDate}
    AND lh."playedAt" < ${endDate}
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

  const total = Number(raw[0]?.totalCount ?? 0);

  const topArtists = raw.map((artist, index) => ({
    rank: offset + index + 1,
    artistId: artist.artistId,
    artistName: artist.artistName,
    playCount: Number(artist.playCount),
    durationMs: Number(artist.totalDurationMs ?? 0),
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
    topArtists,
  };
};
