import workerUtils from "../shared";
import { getPlatformAdapter as defaultGetPlatformAdapter } from "@/platforms/registry";
import { getPlatformConnection as defaultGetPlatformConnection } from "@/models/connectedPlatforms/connectedPlatforms.model";
import { Job } from "bullmq";
import type { pollerData } from "../types";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { WorkerUtils } from "../shared";

export type PlatformPollingDeps = {
  utils: WorkerUtils;
  getPlatformAdapter: typeof defaultGetPlatformAdapter;
  getPlatformConnection: typeof defaultGetPlatformConnection;
};

const defaultDeps: PlatformPollingDeps = {
  utils: workerUtils,
  getPlatformAdapter: defaultGetPlatformAdapter,
  getPlatformConnection: defaultGetPlatformConnection,
};

export const createPlatformPollingProcessor = (
  deps: PlatformPollingDeps = defaultDeps,
) => {
  return async (job: Job<pollerData>) => {
    const { userId, platform } = job.data;

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
