import { beforeEach, describe, expect, it, mock, test } from "bun:test";
import { Job } from "bullmq";
import { createSpotifyPoller } from "../spotifyPoller";
import { createPlatformPollingProcessor } from "../processPlatformPolling";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";
import type { pollerData } from "@/workers/types";
import type { WorkerUtils } from "../../shared";

const fetchRecentTracks = mock();
const redisSet = mock();
const redisDel = mock();
const redisGet = mock();
const findOrCreateArtist = mock();
const connectArtistsAndTrack = mock();
const findOrCreateTrack = mock();
const saveListeningHistory = mock();
const prismaTransaction = mock();

const getPlatformConnection = mock<() => Promise<SpotifyConnection>>();

const spotifyPoller = createSpotifyPoller({
  fetchRecentTracks: fetchRecentTracks as any,
  cache: {
    set: redisSet as any,
    get: redisGet as any,
    del: redisDel as any,
  },
  findOrCreateTrack: findOrCreateTrack as any,
  findOrCreateArtist: findOrCreateArtist as any,
  connectArtistsAndTrack: connectArtistsAndTrack as any,
  saveListeningHistory: saveListeningHistory as any,
  transaction: prismaTransaction as any,
});

const respectRateLimit = mock();
const checkRateLimited = mock();

const mockedUtils: WorkerUtils = {
  locks: { acquireEnrichmentLock: mock() },
  rateLimits: {
    checkRateLimited,
    respectRateLimit,
    CACHE_TTL_SEC: 123,
  },
};
const processPlatformPolling = createPlatformPollingProcessor({
  utils: mockedUtils,
  getPlatformAdapter: (platform) =>
    ({
      poll: spotifyPoller,
    }) as any,
  getPlatformConnection: getPlatformConnection as any,
});

const job = {
  id: "test-job",
  data: { userId: "user-1", platform: "spotify" },
} as unknown as Job<pollerData>;

const spotifyConnection: SpotifyConnection = {
  id: "1234",
  userId: "user-1",
  connectedAt: "2026-01-01T12:00:00Z" as unknown as Date,
  platformName: "spotify",
  platformUserId: "123",
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: "2026-01-01T12:00:00Z" as unknown as Date,
};

const track = {
  trackName: "Track 1",
  platformName: "spotify",
  playedAt: "2026-01-01T12:00:00Z",
  source: "spotify",
  uploadedAt: "2026-01-01T12:01:00Z",
  artists: [{ id: "artist-1", name: "Artist 1" }],
} as any;

beforeEach(() => {
  fetchRecentTracks.mockReset();
  redisSet.mockReset();
  redisDel.mockReset();
  redisGet.mockReset();
  respectRateLimit.mockReset();
  checkRateLimited.mockReset();
  findOrCreateArtist.mockReset();
  connectArtistsAndTrack.mockReset();
  findOrCreateTrack.mockReset();
  saveListeningHistory.mockReset();
  prismaTransaction.mockReset();

  respectRateLimit.mockResolvedValue(undefined);
  redisSet.mockResolvedValue("OK");
  redisDel.mockResolvedValue(1);
  redisGet.mockResolvedValue(null);
  fetchRecentTracks.mockResolvedValue([track]);
  findOrCreateTrack.mockResolvedValue({ id: "track-1" });
  findOrCreateArtist.mockResolvedValue([{ id: "artist-1" }]);
  connectArtistsAndTrack.mockResolvedValue(undefined);
  saveListeningHistory.mockResolvedValue(undefined);
  prismaTransaction.mockImplementation(async (fn: () => Promise<unknown>) =>
    fn(),
  );
});

describe("spotifyPoller", () => {
  it("processes new tracks and advances the cursor", async () => {
    await spotifyPoller(spotifyConnection);

    expect(fetchRecentTracks).toHaveBeenCalledWith(
      spotifyConnection,
      undefined,
    );

    expect(findOrCreateTrack).toHaveBeenCalledWith(track, "spotify");

    expect(saveListeningHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        platformName: "spotify",
        playedAt: track.playedAt,
      }),
      "track-1",
      "user-1",
    );

    expect(redisSet).toHaveBeenCalledWith(
      "spotify-cursor:user-1",
      new Date(track.playedAt).getTime().toString(),
      "EX",
      7 * 24 * 60 * 60,
    );
  });

  it("does nothing when the poller lock is already held", async () => {
    redisSet.mockResolvedValueOnce(null);

    await spotifyPoller(spotifyConnection);

    expect(getPlatformConnection).not.toHaveBeenCalled();
    expect(fetchRecentTracks).not.toHaveBeenCalled();
    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it("does nothing when there are no new tracks", async () => {
    fetchRecentTracks.mockResolvedValue([]);

    await spotifyPoller(spotifyConnection);

    expect(prismaTransaction).not.toHaveBeenCalled();

    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it("uses the existing cursor when fetching tracks", async () => {
    redisGet.mockResolvedValue("123456");

    await spotifyPoller(spotifyConnection);

    expect(fetchRecentTracks).toHaveBeenCalledWith(spotifyConnection, "123456");
  });

  it("does not advance the cursor when persistence fails", async () => {
    saveListeningHistory.mockRejectedValue(new Error("database failure"));

    await expect(spotifyPoller(spotifyConnection)).rejects.toThrow(
      "database failure",
    );

    expect(redisSet).not.toHaveBeenCalledWith(
      "spotify-cursor:user-1",
      expect.anything(),
      "EX",
      expect.anything(),
    );
  });

  it("releases the lock when processing fails", async () => {
    saveListeningHistory.mockRejectedValue(new Error("database failure"));

    await expect(spotifyPoller(spotifyConnection)).rejects.toThrow(
      "database failure",
    );

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  it("releases the lock after successful processing", async () => {
    await spotifyPoller(spotifyConnection);

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  it("propagates a failed transaction", async () => {
    prismaTransaction.mockRejectedValue(new Error("transaction failed"));

    await expect(spotifyPoller(spotifyConnection)).rejects.toThrow(
      "transaction failed",
    );

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  describe("429 rate limiting", () => {
    test("handles SpotifyRateLimitError", async () => {
      const rateLimitError = new SpotifyRateLimitError("30");

      getPlatformConnection.mockResolvedValue(spotifyConnection);
      fetchRecentTracks.mockRejectedValue(rateLimitError);

      await processPlatformPolling(job);

      expect(respectRateLimit).toHaveBeenCalledWith(rateLimitError, job);
    });
  });
});
