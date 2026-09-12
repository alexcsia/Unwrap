import { Job } from "bullmq";
import workerUtils from "../shared";
import * as ingestionHelpers from "./helpers";
import type { HistoryIngestionJobData } from "../types";
import { getPlatformAdapter } from "@/platforms/registry";

export async function processHistoryIngestion(
  job: Job<HistoryIngestionJobData>,
) {
  if (await workerUtils.rateLimits.checkRateLimited(job)) {
    return;
  }

  const { userId, entry: rawEntry, platform } = job.data;

  const entry = ingestionHelpers.toUploadData(userId, rawEntry);
  const adapter = getPlatformAdapter(platform);

  console.log(`[Job ${job.id}] Processing: "${entry.trackName}"`);

  try {
    const result = await adapter.ingestHistory(userId, entry);

    if (result.status === "retry") {
      await job.moveToDelayed(Date.now() + 1000);
      return;
    }

    return { status: "completed" };
  } catch (error: any) {
    if (error.statusCode === 429) {
      await workerUtils.rateLimits.respectRateLimit(error, job);
      return;
    }

    console.error(`[Job ${job.id}] Fatal error: ${error.message}`);
    throw error;
  }
}
