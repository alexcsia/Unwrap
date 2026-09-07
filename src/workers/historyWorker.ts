import { Worker, Job } from "bullmq";
import prisma from "@/utils/prisma.util";
import { saveListeningHistory } from "@/models/listeningHistory.model";
import { getSpotifyArtistIds } from "@/services/listening-history/platforms/spotify/utils";
import { getPlatformConnection } from "@/models/connectedPlatforms";
import type { HistorySyncJobData, UploadData } from "./types";
import { redisConnection, redisCache } from "@/lib/queue";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
} from "@/services/listening-history/platforms/spotify/types";
import { findOrCreateArtist } from "@/models/artist.model";
import {
  findOrCreateTrack,
  connectArtistsAndTrack,
} from "@/models/track.model";

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

    const entry: UploadData = {
      userId,
      platformTrackId: rawEntry.platformTrackId,
      platformName: rawEntry.platformName,
      trackName: rawEntry.trackName,
      albumName: rawEntry.albumName,
      durationMs: rawEntry.durationMs,
      source: rawEntry.source,
      isrc: rawEntry.isrc || undefined,
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

    const lockKey = `lock:track:${entry.platformTrackId}`;
    let lockAcquired = false;

    try {
      console.log(`[Job ${job.id}] Processing: "${entry.trackName}"`);

      const isPending = entry.artists.some((a) =>
        a.platformId.startsWith("pending:"),
      );
      const connection = await getPlatformConnection(userId, "spotify");

      let resolvedArtists = entry.artists;

      if (isPending && connection) {
        const cacheKey = `spotify:track:${entry.platformTrackId}:artists`;
        const cached = await redisCache.get(cacheKey);

        if (cached) {
          await redisCache.expire(cacheKey, CACHE_TTL_SEC);
          resolvedArtists = JSON.parse(cached);
          console.log(`[Job ${job.id}] Cache hit for artist IDs`);
        } else {
          const lock = await redisCache.set(lockKey, "1", "EX", 30, "NX");

          if (!lock) {
            console.log(
              `[Job ${job.id}] Enrichment lock contended, retrying in 1s`,
            );
            await job.moveToDelayed(Date.now() + 1000);
            return;
          }

          lockAcquired = true;
          console.log(`[Job ${job.id}] Fetching artist IDs from Spotify...`);

          try {
            const artistsFromSpotify = await getSpotifyArtistIds(
              entry.platformTrackId,
              connection,
            );

            await redisCache.set(
              cacheKey,
              JSON.stringify(artistsFromSpotify),
              "EX",
              CACHE_TTL_SEC,
            );

            if (artistsFromSpotify?.length) {
              resolvedArtists = artistsFromSpotify.map((a) => ({
                platformId: a.id,
                name: a.name,
              }));
            }
          } catch (apiErr: any) {
            console.warn(
              `[Job ${job.id}] Enrichment failed: ${apiErr.message}. Saving with pending artists.`,
            );
          }
        }
      }

      const track: SpotifyTrackDTO = {
        platformTrackId: entry.platformTrackId,
        trackName: entry.trackName,
        albumName: entry.albumName,
        durationMs: entry.durationMs,
        metadata: entry.metadata,
        isrc: entry.isrc,
      };

      const listeningHistory: SpotifyListeningHistoryDTO = {
        playedAt: entry.playedAt,
        platformName: entry.platformName,
        source: entry.source,
        uploadedAt: entry.uploadedAt,
      };

      const artists: SpotifyArtistDTO[] = resolvedArtists.map((a) => ({
        name: a.name,
        genres: [],
        imageUrl: undefined,
        platformId: a.platformId,
      }));

      await prisma.$transaction(async () => {
        const savedTrack = await findOrCreateTrack(track, entry.platformName);
        if (!savedTrack) {
          throw new Error(`Failed to find or create track: ${entry.trackName}`);
        }

        const savedArtists = await findOrCreateArtist(
          artists,
          entry.platformName,
        );

        await connectArtistsAndTrack(savedTrack, savedArtists);

        await saveListeningHistory(listeningHistory, savedTrack.id, userId);
      });

      console.log(`[Job ${job.id}] Saved to DB`);
      return { status: "completed" };
    } catch (error: any) {
      if (error.statusCode === 429) {
        const delay = error.meta?.retryAfter
          ? Number(error.meta.retryAfter) * 1000
          : 30_000;
        console.warn(
          `[Job ${job.id}] Rate limited. Retrying in ${delay / 1000}s`,
        );
        await job.moveToDelayed(Date.now() + delay);
        return;
      }

      console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
      throw error;
    } finally {
      if (lockAcquired) {
        await redisCache.del(lockKey).catch(() => {});
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
  console.log(`[Worker] Job ${job.id} completed`),
);
worker.on("failed", (job, err) =>
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`),
);
worker.on("error", (err) => console.error(`[Worker] Connection error:`, err));
