import { Worker, Job } from "bullmq";
import { saveListeningHistory } from "@/models/history.model";
import { getSpotifyArtistIds } from "@/services/listening-history/platforms/spotify/utils";
import { getPlatformConnection } from "@/models/connectedPlatforms";
import type { HistorySyncJobData } from "./types";
import { redisConnection } from "@/lib/queue";
import type { ListeningHistoryDTO } from "@/services/listening-history/platforms/spotify/validators";
import { redisCache } from "@/lib/queue";

const CACHE_TTL_SEC = 7 * 24 * 3600; // 7 days

/**
 * Service: history-sync Worker
 *
 * Background worker that processes and enriches listening history entries from a BullMQ queue.
 *
 * Flow:
 * -  Extracts and formats raw job data into a standardized ListeningHistoryDTO.
 * - Identifies entries missing platform-specific Artist IDs (common in file uploads).
 * - Checks Redis for cached artist IDs to minimize Spotify API calls.
 * - Spotify Enrichment: Fetches missing Artist IDs from Spotify API if not cached.
 *
 * Configuration:
 * - Rate limited to 10 jobs per second to respect Spotify API quotas.
 * - Retains a history of 100 completed and 500 failed jobs for monitoring.
 *
 * Errors:
 * - Moves job to "Delayed" state on API rate limits.
 * - Throws fatal errors for database failures, triggering BullMQ's automatic retry logic.
 */

const worker = new Worker<HistorySyncJobData>(
  "history-sync",
  async (job: Job<HistorySyncJobData>) => {
    console.log("[Worker] Starting job", job.id);
    const { userId, entry: rawEntry } = job.data;

    let lockKey: string | null = null;
    let lockAcquired = false;

    const entry: ListeningHistoryDTO = {
      userId: userId,
      platformTrackId: rawEntry.platformTrackId,
      platformName: rawEntry.platformName,
      trackName: rawEntry.trackName,
      albumName: rawEntry.albumName,
      durationMs: rawEntry.durationMs,
      source: rawEntry.source,
      metadata: (rawEntry.metadata as any) || {},
      playedAt: new Date(rawEntry.playedAt),
      uploadedAt: rawEntry.uploadedAt
        ? new Date(rawEntry.uploadedAt)
        : new Date(),
      artists: (Array.isArray(rawEntry.artists)
        ? rawEntry.artists
        : (rawEntry.artists as any)?.connectOrCreate?.map(
            (a: any) => a.create,
          ) || []
      )
        .filter((a: any) => a?.name)
        .map((a: any) => ({
          platformId:
            a.platformId && a.platformId !== "undefined"
              ? a.platformId
              : `pending:${a.name}`,
          name: a.name,
        })),
    };

    try {
      console.log(`[Job ${job.id}]  Processing: "${entry.trackName}"`);

      const isPending = entry.artists.some((a) =>
        a.platformId.startsWith("pending:"),
      );
      const connection = await getPlatformConnection(userId, "spotify");

      if (isPending && connection) {
        const cacheKey = `spotify:track:${entry.platformTrackId}:artists`;
        lockKey = `lock:track:${entry.platformTrackId}`;

        const cached = await redisCache.get(cacheKey);
        let artistsFromSpotify: { id: string; name: string }[] | null = null;

        if (cached) {
          await redisCache.expire(cacheKey, CACHE_TTL_SEC);
          artistsFromSpotify = JSON.parse(cached);
          console.log(`[Job ${job.id}]  Cache hit`);
        } else {
          const lock = await redisCache.set(lockKey, "1", "EX", 30, "NX");
          if (lock) {
            lockAcquired = true;
            console.log(`[Job ${job.id}]  Fetching from Spotify...`);

            try {
              artistsFromSpotify = await getSpotifyArtistIds(
                entry.platformTrackId,
                connection,
              );
              await redisCache.set(
                cacheKey,
                JSON.stringify(artistsFromSpotify),
                "EX",
                CACHE_TTL_SEC,
              );
            } catch (apiErr: any) {
              if (apiErr.status === 429) {
                const delay = (apiErr.retryAfter || 30) * 1000;
                console.warn(
                  `[Job ${job.id}]  Rate limit. Retrying in ${delay / 1000}s`,
                );
                await job.moveToDelayed(Date.now() + delay);
                return;
              }
              console.warn(
                `[Job ${job.id}]  Enrichment failed: ${apiErr.message}. Saving pending version.`,
              );
            }
          } else {
            console.log(`[Job ${job.id}]  Resource locked, retrying...`);
            await job.moveToDelayed(Date.now() + 1000);
            return;
          }
        }

        if (artistsFromSpotify && artistsFromSpotify.length > 0) {
          entry.artists = artistsFromSpotify.map((a) => ({
            platformId: a.id,
            name: a.name,
          }));
        }
      }

      await saveListeningHistory(entry);
      console.log(`[Job ${job.id}]  Saved to DB.`);
      return { status: "completed" };
    } catch (error: any) {
      console.error(`[Job ${job.id}]  Fatal Error: ${error.message}`);
      throw error;
    } finally {
      if (lockAcquired && lockKey) {
        await redisCache.del(lockKey);
      }
    }
  },
  {
    connection: redisConnection,
    limiter: {
      max: 10,
      duration: 1000,
    },
    lockDuration: 60000,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

worker.on("completed", (job) =>
  console.log(`[Worker] Job ${job.id} completed.`),
);

worker.on("failed", (job, err) =>
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`),
);

worker.on("error", (err) => console.error(`[Worker] Connection Error:`, err));
