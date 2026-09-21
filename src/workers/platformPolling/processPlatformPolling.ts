import workerUtils from "../shared";
import { getPlatformAdapter } from "@/platforms/registry";
import { Job } from "bullmq";
import type { pollerData } from "../types";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";

export async function processPlatformPolling(job: Job<pollerData>) {
  const { userConnectedPlatforms, platform } = job.data;

  if (await workerUtils.rateLimits.checkRateLimited(job)) {
    return;
  }
  try {
    const adapter = getPlatformAdapter(platform);

    await adapter.poll(userConnectedPlatforms);
  } catch (error: any) {
    if (error instanceof SpotifyRateLimitError) {
      await workerUtils.rateLimits.respectRateLimit(error, job);
      return;
    }

    console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
    throw error;
  }
}
