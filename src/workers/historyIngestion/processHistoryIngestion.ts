import { Job } from "bullmq";
import workerUtils from "../shared";
import * as ingestionHelpers from "./helpers";
import type { HistoryIngestionJobData } from "../types";
import { getPlatformAdapter as defaultGetPlatformAdapter } from "@/platforms/registry";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { WorkerUtils } from "../shared";

export const createHistoryIngestionProcessor = (
  utils: WorkerUtils = workerUtils,
  getPlatformAdapter = defaultGetPlatformAdapter,
) => {
  return async (job: Job<HistoryIngestionJobData>) => {
    if (await utils.rateLimits.checkRateLimited(job)) {
      return;
    }

    const { userId, entry: rawEntry, platform } = job.data;

    const entry = ingestionHelpers.toUploadData(userId, rawEntry);
    const adapter = getPlatformAdapter(platform);

    console.log(`[Job ${job.id}] Processing: "${entry.trackName}"`);

    try {
      if (!adapter.ingestHistory) {
        throw new Error(`${platform} does not support history ingestion`);
      }
      const result = await adapter.ingestHistory(userId, entry);

      if (result.status === "retry") {
        await job.moveToDelayed(Date.now() + 1000);
        return;
      }

      return { status: "completed" };
    } catch (error: any) {
      if (error instanceof SpotifyRateLimitError) {
        await utils.rateLimits.respectRateLimit(error, job);
        return;
      }

      console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
      throw error;
    }
  };
};
