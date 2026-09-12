import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { Job } from "bullmq";
import type { HistoryIngestionJobData } from "@/workers/types";
import { processHistoryIngestion } from "../processHistoryIngestion";

const mockCheckRateLimited = mock();
const mockRespectRateLimit = mock();
const mockIngestHistory = mock();
const mockGetPlatformAdapter = mock();

const mockRedisGet = mock();
const mockRedisExpire = mock();
const mockRedisDel = mock();

mock.module("@/services/redis", () => ({
  redisCache: {
    get: mockRedisGet,
    expire: mockRedisExpire,
    del: mockRedisDel,
  },
  redisConnection: {},
}));

mock.module("@/utils/rateLimit.util", () => ({
  checkRateLimited: mockCheckRateLimited,
  respectRateLimit: mockRespectRateLimit,
}));

mock.module("@/platforms/registry", () => ({
  getPlatformAdapter: mockGetPlatformAdapter,
}));

const userId = "user-123";

const rawEntry = {
  platformTrackId: "track-123",
  platformName: "spotify",
  trackName: "Superstitious",
  artists: [
    {
      platformId: "artist-456",
      name: "Stevie Wonder",
    },
  ],
};

const job = {
  id: "job-123",
  data: {
    userId,
    entry: rawEntry,
  },
} as Job<HistoryIngestionJobData>;

const pendingEntry = {
  ...rawEntry,
  artists: [{ platformId: "pending:Stevie Wonder", name: "Stevie Wonder" }],
};

const pendingJob = {
  ...job,
  data: { userId, entry: pendingEntry },
} as Job<HistoryIngestionJobData>;

describe("history-ingestion worker processor", () => {
  beforeEach(() => {
    mockCheckRateLimited.mockReset();
    mockRespectRateLimit.mockReset();
    mockIngestHistory.mockReset();
    mockGetPlatformAdapter.mockReset();
    mockRedisGet.mockReset();
    mockRedisExpire.mockReset();
    mockRedisDel.mockReset();

    mockCheckRateLimited.mockResolvedValue(false);
    mockRedisDel.mockResolvedValue(undefined);
    mockIngestHistory.mockResolvedValue({ status: "completed" });
    mockGetPlatformAdapter.mockReturnValue({
      platformName: "spotify",
      ingestHistory: mockIngestHistory,
    });
  });

  test("aborts early when job is rate-limited", async () => {
    mockCheckRateLimited.mockResolvedValue(true);

    const result = await processHistoryIngestion(job);

    expect(result).toBeUndefined();
    expect(mockIngestHistory).not.toHaveBeenCalled();
  });

  test("gets the correct platform adapter for the entry platform", async () => {
    await processHistoryIngestion(job);

    expect(mockGetPlatformAdapter).toHaveBeenCalledWith("spotify");
  });

  test("delegates to adapter.ingestHistory with correct arguments", async () => {
    await processHistoryIngestion(job);

    expect(mockIngestHistory).toHaveBeenCalledWith(userId, rawEntry);
  });

  test("returns completed status on success", async () => {
    const result = await processHistoryIngestion(job);

    expect(result).toEqual({ status: "completed" });
  });

  test("catches 429 errors and delegates to rate limit handler", async () => {
    const rateLimitErr = Object.assign(new Error("Rate Limited"), {
      statusCode: 429,
    });
    mockIngestHistory.mockRejectedValue(rateLimitErr);

    const result = await processHistoryIngestion(job);

    expect(result).toBeUndefined();
    expect(mockRespectRateLimit).toHaveBeenCalledWith(rateLimitErr, job);
  });

  test("re-throws non-429 errors to trigger BullMQ retry", async () => {
    mockIngestHistory.mockRejectedValue(new Error("Database failure"));

    await expect(processHistoryIngestion(job)).rejects.toThrow(
      "Database failure",
    );
  });

  test("throws when platform adapter is not found", async () => {
    mockGetPlatformAdapter.mockImplementation(() => {
      throw new Error("Unsupported platform: unknown");
    });

    const unknownJob = {
      ...job,
      data: { userId, entry: { ...rawEntry, platformName: "unknown" } },
    } as Job<HistoryIngestionJobData>;

    await expect(processHistoryIngestion(unknownJob)).rejects.toThrow(
      "Unsupported platform: unknown",
    );
  });

  test("works correctly with pending artist IDs", async () => {
    await processHistoryIngestion(pendingJob);

    expect(mockIngestHistory).toHaveBeenCalledWith(userId, pendingEntry);
    expect(mockIngestHistory).toHaveBeenCalledTimes(1);
  });
});
