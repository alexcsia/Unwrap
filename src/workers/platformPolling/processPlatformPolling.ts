import workerUtils from "../shared";
import { getPlatformAdapter as defaultGetPlatformAdapter } from "@/platforms/registry";
import { getPlatformConnection as defaultGetPlatformConnection } from "@/models/connectedPlatforms/connectedPlatforms.model";
import { Job } from "bullmq";
import type { pollerData } from "../types";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { WorkerUtils } from "../shared";

export const CURSOR_TTL = 7 * 24 * 60 * 60; // 7 days

export type PlatformPollingDeps = {
  utils: WorkerUtils;
  getPlatformAdapter: typeof defaultGetPlatformAdapter;
  getPlatformConnection: typeof defaultGetPlatformConnection;
};

export const createPlatformPollingProcessor = (
  overrides: Partial<PlatformPollingDeps> = {},
) => {
  return async (job: Job<pollerData>) => {
    const deps: PlatformPollingDeps = {
      utils: overrides.utils ?? workerUtils,
      getPlatformConnection:
        overrides.getPlatformConnection ?? defaultGetPlatformConnection,
      getPlatformAdapter:
        overrides.getPlatformAdapter ?? defaultGetPlatformAdapter,
    };
    console.log({
      jobId: job.id,
      name: job.name,
      attemptsMade: job.attemptsMade,
      userId: job.data.userId,
      timestamp: new Date().toISOString(),
    });

    const { userId, platform } = job.data;

    console.log("reached processor", userId, platform);

    if (await deps.utils.rateLimits.checkRateLimited(job)) {
      return;
    }

    try {
      const connection = await deps.getPlatformConnection(userId, platform);

      const adapter = deps.getPlatformAdapter(platform);

      if (!adapter.poll) {
        return;
      }

      await adapter.poll(connection);
    } catch (error: any) {
      if (error instanceof SpotifyRateLimitError) {
        await deps.utils.rateLimits.respectRateLimit(error, job);
        return;
      }

      console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
      throw error;
    }
  };
};

export const processPlatformPolling = createPlatformPollingProcessor();
