import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { Job } from "bullmq";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { HistoryIngestionJobData } from "@/workers/types";
import { createHistoryIngestionProcessor } from "../processHistoryIngestion";
import type { WorkerUtils } from "../../shared";

const mockCheckRateLimited = mock();
const mockRespectRateLimit = mock();
const mockIngestHistory = mock();
const mockGetPlatformAdapter = mock();

const mockedUtils: WorkerUtils = {
  locks: {
    acquireEnrichmentLock: mock(),
  },
  rateLimits: {
    checkRateLimited: mockCheckRateLimited,
    respectRateLimit: mockRespectRateLimit,
    CACHE_TTL_SEC: 1112121,
  },
};

const processHistoryIngestion = createHistoryIngestionProcessor(
  mockedUtils,
  mockGetPlatformAdapter,
);

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
    platform: "spotify",
    entry: rawEntry,
  },
} as Job<HistoryIngestionJobData>;

const pendingEntry = {
  ...rawEntry,
  artists: [
    {
      platformId: "pending:Stevie Wonder",
      name: "Stevie Wonder",
    },
  ],
};

const pendingJob = {
  ...job,
  data: {
    userId,
    platform: "spotify",
    entry: pendingEntry,
  },
} as Job<HistoryIngestionJobData>;

describe("history-ingestion worker processor", () => {
  beforeEach(() => {
    mockCheckRateLimited.mockReset();
    mockRespectRateLimit.mockReset();
    mockIngestHistory.mockReset();
    mockGetPlatformAdapter.mockReset();

    mockCheckRateLimited.mockResolvedValue(false);

    mockRespectRateLimit.mockResolvedValue(undefined);

    mockIngestHistory.mockResolvedValue({
      status: "completed",
    });

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
    expect(mockGetPlatformAdapter).not.toHaveBeenCalled();
  });

  test("gets the correct platform adapter for the job platform", async () => {
    await processHistoryIngestion(job);

    expect(mockGetPlatformAdapter).toHaveBeenCalledWith("spotify");
  });

  test("delegates to adapter.ingestHistory with transformed entry", async () => {
    await processHistoryIngestion(job);

    expect(mockIngestHistory).toHaveBeenCalledTimes(1);

    expect(mockIngestHistory).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        userId,
        platformTrackId: "track-123",
        platformName: "spotify",
        trackName: "Superstitious",
        metadata: {},
        artists: [
          {
            platformId: "artist-456",
            name: "Stevie Wonder",
          },
        ],
      }),
    );
  });

  test("returns completed status on success", async () => {
    const result = await processHistoryIngestion(job);

    expect(result).toEqual({
      status: "completed",
    });
  });

  test("catches 429 errors and delegates to rate limit handler", async () => {
    const rateLimitErr = new SpotifyRateLimitError(30);
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

    expect(mockRespectRateLimit).not.toHaveBeenCalled();
  });
  test("throws when platform adapter is not found", async () => {
    mockGetPlatformAdapter.mockImplementation(() => {
      throw new Error("Unsupported platform: unknown");
    });

    const unknownJob = {
      ...job,
      data: {
        userId,
        platform: "unknown",
        entry: rawEntry,
      },
    } as unknown as Job<HistoryIngestionJobData>;

    await expect(processHistoryIngestion(unknownJob)).rejects.toThrow(
      "Unsupported platform: unknown",
    );

    expect(mockIngestHistory).not.toHaveBeenCalled();
  });

  test("works correctly with pending artist IDs", async () => {
    await processHistoryIngestion(pendingJob);

    expect(mockIngestHistory).toHaveBeenCalledTimes(1);

    expect(mockIngestHistory).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        userId,
        platformTrackId: "track-123",
        platformName: "spotify",
        trackName: "Superstitious",
        metadata: {},
        artists: [
          {
            platformId: "pending:Stevie Wonder",
            name: "Stevie Wonder",
          },
        ],
      }),
    );
  });
});
