import { ApiError } from "@/errors/ApiError";
import { listeningHistoryArraySchema } from "../validators";
import { historyQueue } from "@/lib/queue";

const BATCH_SIZE = 1000;

export const processSpotifyEntries = async (
  rawEntries: any[],
  userId: string,
) => {
  if (!userId) {
    throw new ApiError(500, "UNAUTHORIZED", "User ID is undefined");
  }
  if (!rawEntries || !Array.isArray(rawEntries) || rawEntries.length === 0) {
    console.error(`[ERROR] No entries found for user ${userId}`);
    return;
  }
  console.log(rawEntries.length, "entries to process for user", userId);

  for (let i = 0; i < rawEntries.length; i += BATCH_SIZE) {
    const batch = rawEntries.slice(i, i + BATCH_SIZE);
    console.log(batch.length, "entries in batch", i);
    const transformed = batch
      .filter((raw) => raw.spotify_track_uri !== null)
      .map((raw) => {
        const trackId = raw.spotify_track_uri?.split(":").pop() || "unknown";
        return {
          userId,
          platformTrackId: trackId,
          platformName: "spotify",
          trackName: raw.master_metadata_track_name || "Unknown Track",
          albumName: raw.master_metadata_album_album_name || "Unknown Album",
          durationMs: raw.ms_played || 0,
          playedAt: raw.ts,
          // isrc: raw.isrc,
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
      console.error("--- DEBUG START ---");
      console.error("Batch Index:", i);
      console.error("Input UserID Variable:", userId);
      console.error("Sample Item:", JSON.stringify(transformed[0], null, 2));
      console.error(
        "Zod Issues:",
        JSON.stringify(result.error.issues, null, 2),
      );
      console.error("--- DEBUG END ---");
      throw new ApiError(400, "INVALID_UPLOAD", `Malformed data at batch ${i}`);
    }

    console.log(result.data.length, "valid entries in batch", i);
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
      console.log(createdJobs.length, "jobs created for batch", i);
    }
  }
};
