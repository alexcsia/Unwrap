import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  test,
} from "bun:test";

import { spotifyPoller } from "../spotifyPoller";
import prisma from "@/utils/prisma.util";
import { redisCache } from "@/lib/queue";
import { Job } from "bullmq";

const fetchRecentTracks = mock();
const redisSet = mock();
const redisDel = mock();
const redisGet = mock();
const getPlatformConnection = mock();
const findOrCreateArtist = mock();
const connectArtistsAndTrack = mock();
const findOrCreateTrack = mock();
const saveListeningHistory = mock();
const prismaTransaction = mock();
const respectRateLimit = mock();
const checkRateLimited = mock();

mock.module("../../shared", () => ({
  default: {
    locks: {},
    rateLimits: {
      respectRateLimit,
      checkRateLimited,
    },
  },
}));

import { processPlatformPolling } from "../processPlatformPolling";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";

mock.module("@/platforms/spotify/utils", () => ({
  fetchRecentTracks,
}));

mock.module("@/models/connectedPlatforms.model", () => ({
  getPlatformConnection,
}));

mock.module("@/models/artist.model", () => ({
  findOrCreateArtist,
}));

mock.module("@/models/track.model", () => ({
  connectArtistsAndTrack,
  findOrCreateTrack,
}));

mock.module("@/models/listeningHistory.model", () => ({
  saveListeningHistory,
}));

const originalTransaction = prisma.$transaction;

const originalRedisSet = redisCache.set;
const originalRedisDel = redisCache.del;
const originalRedisGet = redisCache.get;

const user = {
  userId: "user-1",
  platform: "spotify",
} as any;

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

  respectRateLimit.mockResolvedValue(undefined);
  getPlatformConnection.mockReset();
  findOrCreateArtist.mockReset();
  connectArtistsAndTrack.mockReset();
  findOrCreateTrack.mockReset();
  saveListeningHistory.mockReset();
  prismaTransaction.mockReset();

  redisCache.set = redisSet as typeof redisCache.set;
  redisCache.del = redisDel as typeof redisCache.del;
  redisCache.get = redisGet as typeof redisCache.get;

  prisma.$transaction =
    prismaTransaction as unknown as typeof prisma.$transaction;

  redisSet.mockResolvedValue("OK");
  redisDel.mockResolvedValue(1);
  redisGet.mockResolvedValue(null);

  getPlatformConnection.mockResolvedValue({
    accessToken: "token",
  });

  fetchRecentTracks.mockResolvedValue([track]);

  findOrCreateTrack.mockResolvedValue({
    id: "track-1",
  });

  findOrCreateArtist.mockResolvedValue([{ id: "artist-1" }]);

  connectArtistsAndTrack.mockResolvedValue(undefined);
  saveListeningHistory.mockResolvedValue(undefined);

  prismaTransaction.mockImplementation(async (callback: any) => {
    return callback();
  });
});

afterEach(() => {
  prisma.$transaction = originalTransaction;

  redisCache.set = originalRedisSet;
  redisCache.del = originalRedisDel;
  redisCache.get = originalRedisGet;
});

describe("spotifyPoller", () => {
  it("processes new tracks and advances the cursor", async () => {
    await spotifyPoller(user);

    expect(fetchRecentTracks).toHaveBeenCalledWith(user, undefined);

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

    await spotifyPoller(user);

    expect(getPlatformConnection).not.toHaveBeenCalled();
    expect(fetchRecentTracks).not.toHaveBeenCalled();
    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it("does nothing when the Spotify connection does not exist", async () => {
    getPlatformConnection.mockResolvedValue(null);

    await spotifyPoller(user);

    expect(fetchRecentTracks).not.toHaveBeenCalled();
    expect(prismaTransaction).not.toHaveBeenCalled();
  });

  it("does nothing when there are no new tracks", async () => {
    fetchRecentTracks.mockResolvedValue([]);

    await spotifyPoller(user);

    expect(prismaTransaction).not.toHaveBeenCalled();

    expect(redisSet).toHaveBeenCalledTimes(1);
  });

  it("uses the existing cursor when fetching tracks", async () => {
    redisGet.mockResolvedValue("123456");

    await spotifyPoller(user);

    expect(fetchRecentTracks).toHaveBeenCalledWith(user, "123456");
  });

  it("does not advance the cursor when persistence fails", async () => {
    saveListeningHistory.mockRejectedValue(new Error("database failure"));

    await expect(spotifyPoller(user)).rejects.toThrow("database failure");

    expect(redisSet).not.toHaveBeenCalledWith(
      "spotify-cursor:user-1",
      expect.anything(),
      "EX",
      expect.anything(),
    );
  });

  it("releases the lock when processing fails", async () => {
    saveListeningHistory.mockRejectedValue(new Error("database failure"));

    await expect(spotifyPoller(user)).rejects.toThrow("database failure");

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  it("releases the lock after successful processing", async () => {
    await spotifyPoller(user);

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  it("propagates a failed transaction", async () => {
    prismaTransaction.mockRejectedValue(new Error("transaction failed"));

    await expect(spotifyPoller(user)).rejects.toThrow("transaction failed");

    expect(redisDel).toHaveBeenCalledWith("spotify-poll-lock:user-1");
  });

  describe("429 rate limiting", () => {
    test("handles SpotifyRateLimitError", async () => {
      const rateLimitError = new SpotifyRateLimitError("30");

      fetchRecentTracks.mockRejectedValue(rateLimitError);

      const job = {
        id: "test-job",
        data: {
          userConnectedPlatforms: user,
          platform: "spotify",
        },
        moveToDelayed: mock(),
      } as unknown as Job;

      await processPlatformPolling(job);

      expect(respectRateLimit).toHaveBeenCalledWith(rateLimitError, job);
    });
  });
});
