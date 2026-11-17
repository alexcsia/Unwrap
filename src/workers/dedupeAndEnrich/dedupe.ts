import type { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma.util";

type Db = Prisma.TransactionClient;

const KEEP = "spotify"; // the row that survives
const DROP = "lastfm";
const FALLBACK_DURATION_MS = 180_000;

export const dedupeTrackListens = async (
  db: Db,
  userId: string,
  trackId: string,
  durationMs?: number | null,
): Promise<number> => {
  const rows = await db.listeningHistory.findMany({
    where: { userId, trackId, platformName: { in: [KEEP, DROP] } },
    select: { id: true, platformName: true, playedAt: true },
    orderBy: { playedAt: "asc" },
  });

  const keep = rows.filter((r) => r.platformName === KEEP);
  const drop = rows.filter((r) => r.platformName === DROP);
  if (keep.length === 0 || drop.length === 0) return 0;

  const dur = durationMs || FALLBACK_DURATION_MS;
  const TOL = 90_000;
  const PAUSE_MAX = 300_000;

  const pairs: { k: string; d: string; gap: number }[] = [];

  for (const k of keep) {
    const start = k.playedAt.getTime();
    const end = start + dur;

    for (const d of drop) {
      const t = d.playedAt.getTime();
      let gap = Math.min(Math.abs(t - start), Math.abs(t - end));
      if (gap > TOL && t < start && start - t <= PAUSE_MAX) gap = start - t;
      if (gap <= Math.max(TOL, PAUSE_MAX))
        pairs.push({ k: k.id, d: d.id, gap });
    }
  }

  pairs.sort((a, b) => a.gap - b.gap);

  const usedKeep = new Set<string>();
  const claimed = new Set<string>();
  for (const p of pairs) {
    if (usedKeep.has(p.k) || claimed.has(p.d)) continue;
    usedKeep.add(p.k);
    claimed.add(p.d);
  }

  if (claimed.size === 0) return 0;

  await db.listeningHistory.deleteMany({
    where: { id: { in: [...claimed] } },
  });

  return claimed.size;
};

export const dedupeUserHistory = async (userId: string): Promise<number> => {
  const tracks = await prisma.$queryRaw<
    { id: string; durationMs: number | null }[]
  >`
    SELECT t.id, t."durationMs"
    FROM "Track" t
    JOIN "ListeningHistory" lh ON lh."trackId" = t.id
    WHERE lh."userId" = ${userId}
      AND lh."platformName" IN (${KEEP}, ${DROP})
    GROUP BY t.id
    HAVING count(DISTINCT lh."platformName") = 2
  `;

  let removed = 0;
  for (const t of tracks) {
    removed += await dedupeTrackListens(prisma, userId, t.id, t.durationMs);
  }

  return removed;
};
