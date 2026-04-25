import { ApiError } from "@/errors/ApiError";
import { listeningHistoryArraySchema } from "../validators";
import { historyQueue } from "@/lib/queue";

const BATCH_SIZE = 1000;

export const processSpotifyEntries = async (
  rawEntries: any[],
  userId: string,
) => {
  if (!rawEntries || !Array.isArray(rawEntries) || rawEntries.length === 0) {
    console.error(
      `[ERROR] No entries found for user ${userId}. Check if JSON files were read correctly.`,
    );
    return;
  }

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
    if (!result.success) {
      console.log(
        "FIRST MALFORMED ITEM:",
        JSON.stringify(transformed[0], null, 2),
      );
      console.log("ZOD ERRORS:", result.error.issues);
      throw new ApiError(400, "INVALID_UPLOAD", `Malformed data at batch ${i}`);
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
    }
  }
};
