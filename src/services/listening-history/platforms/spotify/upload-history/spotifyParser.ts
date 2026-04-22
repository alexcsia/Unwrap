import { ApiError } from "@/errors/ApiError";
import { listeningHistoryArraySchema } from "../validators";
import { historyQueue } from "@/lib/queue";

const BATCH_SIZE = 1000;

export const processSpotifyEntries = async (
  rawEntries: any[],
  userId: string,
) => {
  console.log(`Processing ${rawEntries.length} entries for user: ${userId}`);

  for (let i = 0; i < rawEntries.length; i += BATCH_SIZE) {
    const batch = rawEntries.slice(i, i + BATCH_SIZE);

    const transformed = batch.map((raw) => {
      const trackId = raw.spotify_track_uri?.split(":").pop() || "unknown";
      return {
        userId,
        platformTrackId: trackId,
        platformName: "spotify",
        trackName: raw.master_metadata_track_name || "Unknown Track",
        albumName: raw.master_metadata_album_album_name || "Unknown Album",
        durationMs: raw.ms_played || 0,
        playedAt: raw.ts,
        source: "spotify_upload",
        metadata: raw,
        uploadedAt: new Date(),
        artists: [
          {
            platformId: `pending:${raw.master_metadata_album_artist_name}`,
            name: raw.master_metadata_album_artist_name || "Unknown Artist",
          },
        ],
      };
    });

    const result = listeningHistoryArraySchema.safeParse(transformed);
    console.log(result);
    if (!result.success) {
      throw new ApiError(
        400,
        "INVALID_UPLOAD",
        `Malformed data detected in batch starting at index ${i}`,
      );
    }

    const jobs = result.data.map((entry) => ({
      name: "sync-track",
      data: { userId, entry },
      opts: {
        removeOnComplete: true,
        removeOnFail: { count: 1000 },
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
    }));

    if (jobs.length > 0) {
      const createdJobs = await historyQueue.addBulk(jobs);
      console.log(
        `[Batch] Added ${createdJobs.length} jobs (Total progress: ${i + batch.length}/${rawEntries.length})`,
      );
    }
  }
};
