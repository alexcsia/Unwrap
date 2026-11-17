import prisma from "@/utils/prisma.util";
import { dedupeTrackListens } from "../dedupeAndEnrich/dedupe";

export const mergeTracks = async (
  survivorId: string,
  loserId: string,
): Promise<string[]> => {
  if (survivorId === loserId) return [];

  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; durationMs: number | null }[]
      >`
        SELECT id, "durationMs" FROM "Track"
        WHERE id IN (${survivorId}, ${loserId})
        ORDER BY id
        FOR UPDATE
      `;
      if (rows.length < 2) return [];

      const users = await tx.listeningHistory.findMany({
        where: { trackId: loserId },
        select: { userId: true },
        distinct: ["userId"],
      });
      const userIds = users.map((u) => u.userId);

      await tx.platformTrack.updateMany({
        where: { trackId: loserId },
        data: { trackId: survivorId },
      });

      await tx.trackIdentifier.updateMany({
        where: { trackId: loserId },
        data: { trackId: survivorId },
      });

      await tx.$executeRaw`
        UPDATE "ListeningHistory" lh
         SET "trackId" = ${survivorId},
         "source" = 'identifier merged' 
        WHERE lh."trackId" = ${loserId}
          AND NOT EXISTS (
            SELECT 1 FROM "ListeningHistory" s
            WHERE s."userId" = lh."userId"
              AND s."trackId" = ${survivorId}
              AND s."playedAt" = lh."playedAt")
      `;
      await tx.listeningHistory.deleteMany({ where: { trackId: loserId } });

      await tx.$executeRaw`
        INSERT INTO "_TrackArtists" ("A", "B")
        SELECT "A", ${survivorId} FROM "_TrackArtists" WHERE "B" = ${loserId}
        ON CONFLICT DO NOTHING
      `;
      await tx.$executeRaw`DELETE FROM "_TrackArtists" WHERE "B" = ${loserId}`;

      const survivor = rows.find((r) => r.id === survivorId)!;
      const loser = rows.find((r) => r.id === loserId)!;
      const durationMs = survivor.durationMs || loser.durationMs;

      if (!survivor.durationMs && loser.durationMs) {
        await tx.track.update({
          where: { id: survivorId },
          data: { durationMs: loser.durationMs },
        });
      }

      await tx.$executeRaw`
  UPDATE "Exclusion" e SET "targetId" = ${survivorId}
  WHERE e.type = 'track' AND e."targetId" = ${loserId}
    AND NOT EXISTS (
      SELECT 1 FROM "Exclusion" s
      WHERE s."userId" = e."userId" AND s.type = 'track' AND s."targetId" = ${survivorId})
`;
      await tx.exclusion.deleteMany({
        where: { type: "track", targetId: loserId },
      });

      await tx.track.delete({ where: { id: loserId } });

      let removed = 0;
      for (const userId of userIds) {
        removed += await dedupeTrackListens(tx, userId, survivorId, durationMs);
      }
      console.log(
        `[merge] ${loserId} in ${survivorId} users=${userIds.length} dupes removed=${removed}`,
      );

      return userIds;
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
};
