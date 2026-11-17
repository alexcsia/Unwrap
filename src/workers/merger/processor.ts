import { mergeQueue, type MergeJobData } from "@/lib/queue";
import { mergeTracks } from "./mergeTracks";
import prisma from "@/utils/prisma.util";

export const processMerge = async ({ a, b }: MergeJobData) => {
  const existing = await prisma.track.findMany({
    where: { id: { in: [a, b] } },
    select: { id: true },
  });
  if (existing.length < 2) {
    console.warn(`[merge] skipped, only ${existing.length}/2 tracks exist`);
    return;
  }

  const counts = await prisma.listeningHistory.groupBy({
    by: ["trackId"],
    where: { trackId: { in: [a, b] } },
    _count: { _all: true },
  });
  const plays = (id: string) =>
    counts.find((c) => c.trackId === id)?._count._all ?? 0;

  const [survivor, loser] =
    plays(a) > plays(b) || (plays(a) === plays(b) && a < b) ? [a, b] : [b, a];

  const userIds = await mergeTracks(survivor, loser);

  console.log(
    `[merge] merged ${loser} into ${survivor}, users affected: ${userIds.length}`,
  );
};

export const enqueueMerges = async (trackId: string, others: string[]) => {
  if (others.length === 0) return;
  await mergeQueue.addBulk(
    others.map((other) => {
      const [a, b] = trackId < other ? [trackId, other] : [other, trackId];
      return {
        name: "merge",
        data: { a, b },
        opts: { jobId: `merge-${a}-${b}` },
      };
    }),
  );
};
