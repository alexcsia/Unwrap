import { Worker } from "bullmq";
import prisma from "@/utils/prisma.util";
import { redisConnection } from "@/lib/redis";
import { sweepQueue } from "@/lib/queue";
import { enqueueMerges } from "../merger/processor";
import { fuzzyMatchDuration } from "../lastfmEnrichment/processor";
import { updateTrackWithDuration } from "@/models/track";

let REPEAT;
const NODE_ENV = process.env.NODE_ENV;
const DURATION_TOLERANCE_MS = 50_000;
const MAX_GROUPS_PER_RUN = 500;
const norm = (s: string) => s.trim().toLowerCase();

export const enqueueNameMatchedMerges = async () => {
  const groups = await prisma.$queryRaw<{ title: string; albumName: string }[]>`
  SELECT lower(trim("trackName")) AS title,
         lower(trim("albumName")) as albumName
  FROM "Track"
  WHERE "durationMs" > 0 
  GROUP BY lower(trim("trackName")), lower(trim("albumName"))
  HAVING count(*) > 1
  LIMIT ${MAX_GROUPS_PER_RUN}
`;

  console.log(groups);

  let pairs = 0;

  for (const g of groups) {
    const tracks = await prisma.track.findMany({
      where: {
        trackName: { equals: g.title, mode: "insensitive" },
        albumName: g.albumName,
        durationMs: { gt: 0 },
      },
      select: {
        id: true,
        durationMs: true,
        artists: { select: { name: true } },
      },
    });

    console.log(g, "and its tracks", tracks);

    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const x = tracks[i]!;
        const y = tracks[j]!;

        if (Math.abs(x.durationMs - y.durationMs) > DURATION_TOLERANCE_MS) {
          continue;
        }

        const xArtists = new Set(x.artists.map((a) => norm(a.name)));
        if (!y.artists.some((a) => xArtists.has(norm(a.name)))) {
          console.log(xArtists, y.artists);
          continue;
        }

        await enqueueMerges(x.id, [y.id]);
        pairs++;
      }
    }
  }

  console.log(
    `[sweep] groups=${groups.length}, ${groups.map((g) => g.title)} merge candidates=${pairs}`,
  );
};

export const enrichMissingDurationTracks = async () => {
  const tracks = await prisma.track.findMany({
    where: {
      durationMs: 0,
    },
    include: { artists: true },
  });

  for (const track of tracks) {
    const seconds = await fuzzyMatchDuration(track);
    if (!seconds) return;
    const updated = await updateTrackWithDuration(track.id, seconds);
  }
};

export const trackSweepWorker = new Worker(
  sweepQueue.name,
  async () => {
    await enrichMissingDurationTracks();
    await enqueueNameMatchedMerges();
  },
  { connection: redisConnection, concurrency: 1 },
);

trackSweepWorker.on("failed", (job, err) =>
  console.error(`[sweep] job ${job?.id} failed: ${err.message}`),
);
trackSweepWorker.on("error", (err) =>
  console.error("[sweep] worker error", err),
);

if (NODE_ENV !== "production") REPEAT = 0.5 * 60 * 1000;
else REPEAT = 30 * 60 * 1000;

export const scheduleTrackSweep = () =>
  sweepQueue.upsertJobScheduler(
    "name-match-sweep",
    { every: REPEAT },
    { name: "sweep" },
  );
