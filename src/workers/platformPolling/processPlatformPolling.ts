import workerUtils from "../shared";
import { getPlatformAdapter } from "@/platforms/registry";
import { Job } from "bullmq";
import type { pollerData } from "../types";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import { getPlatformConnection } from "@/models/connectedPlatforms/connectedPlatforms.model";

export async function processPlatformPolling(job: Job<pollerData>) {
  const { userId, platform } = job.data;

  if (await workerUtils.rateLimits.checkRateLimited(job)) {
    return;
  }

  try {
    const connection = await getPlatformConnection(userId, platform);

    const adapter = getPlatformAdapter(platform);

    if (!adapter.poll) {
      return;
    }

    await adapter.poll(connection);
  } catch (error: any) {
    if (error instanceof SpotifyRateLimitError) {
      await workerUtils.rateLimits.respectRateLimit(error, job);
      return;
    }

    console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
    throw error;
  }
}
