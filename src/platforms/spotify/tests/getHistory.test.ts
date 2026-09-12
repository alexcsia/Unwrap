// integration tests
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import prisma from "@/utils/prisma.util";
import { spotifyGetHistoryHandler } from "../getHistory";

const mockedFetchRecentTracks = mock();

mock.module("@/platforms/spotify/utils", () => ({
  fetchRecentTracks: mockedFetchRecentTracks,
}));

async function cleanDatabase() {
  await prisma.listeningHistory.deleteMany();
  await prisma.platformTrack.deleteMany();
  await prisma.platformArtist.deleteMany();
  await prisma.track.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.connectedPlatforms.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  mockedFetchRecentTracks.mockReset();

  await cleanDatabase();
});

afterEach(async () => {
  mockedFetchRecentTracks.mockReset();

  await cleanDatabase();
});

async function createUser() {
  return prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@test.com`,
      displayName: "Test User",
      passwordHash: "hash",
    },
  });
}

async function createSpotifyConnection(userId: string) {
  return prisma.connectedPlatforms.create({
    data: {
      userId,
      platformName: "spotify",
      AccessToken: "test-access-token",
      RefreshToken: "test-refresh-token",
      platformUserId: "platformUserId",
      expiresAt: "2026-08-08T00:00:00.000Z",
    },
  });
}

describe("spotifyGetHistoryHandler", () => {
  test("saves Spotify history and returns the persisted data", async () => {
    const user = await createUser();

    await createSpotifyConnection(user.id);

    mockedFetchRecentTracks.mockResolvedValue([
      {
        userId: user.id,
        platformTrackId: "spotify-track-1",
        platformName: "spotify",
        playedAt: new Date("2026-01-01T12:00:00.000Z"),
        trackName: "Test Track",
        albumName: "Test Album",
        durationMs: 200000,
        source: "get_recently_played",
        metadata: null,
        isrc: "US-TEST-123",
        uploadedAt: new Date("2026-01-01T12:01:00.000Z"),
        artists: [
          {
            platformId: "spotify-artist-1",
            name: "Test Artist",
          },
        ],
      },
    ]);

    const result = await spotifyGetHistoryHandler(user.id);

    expect(result.history).toHaveLength(1);

    expect(result.history[0]).toMatchObject({
      track: {
        trackName: "Test Track",
        albumName: "Test Album",
        durationMs: 200000,
      },
      artists: {
        artistsNames: ["Test Artist"],
      },
      listeningEvent: {
        playedAt: new Date("2026-01-01T12:00:00.000Z"),
        source: "get_recently_played",
      },
    });

    const tracks = await prisma.track.findMany();

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      trackName: "Test Track",
      albumName: "Test Album",
      durationMs: 200000,
    });

    const artists = await prisma.artist.findMany();

    expect(artists).toHaveLength(1);
    expect(artists[0]!.name).toBe("Test Artist");

    const history = await prisma.listeningHistory.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      userId: user.id,
      trackId: tracks[0]!.id,
      platformName: "spotify",
      source: "get_recently_played",
    });

    const platformTrack = await prisma.platformTrack.findFirst({
      where: {
        platformTrackId: "spotify-track-1",
        platformName: "spotify",
      },
    });

    expect(platformTrack).not.toBeNull();
  });

  test("connects the saved artist to the saved track", async () => {
    const user = await createUser();

    await createSpotifyConnection(user.id);

    mockedFetchRecentTracks.mockResolvedValue([
      {
        userId: user.id,
        platformTrackId: "spotify-track-1",
        platformName: "spotify",
        playedAt: new Date("2026-01-01T12:00:00.000Z"),
        trackName: "Test Track",
        albumName: "Test Album",
        durationMs: 200000,
        source: "get_recently_played",
        metadata: null,
        isrc: null,
        uploadedAt: new Date(),
        artists: [
          {
            platformId: "spotify-artist-1",
            name: "Test Artist",
          },
        ],
      },
    ]);

    const result = await spotifyGetHistoryHandler(user.id);

    const trackId = result.history[0]!.track.trackId;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artists: true,
      },
    });

    expect(track?.artists).toHaveLength(1);
    expect(track?.artists[0]!.name).toBe("Test Artist");
  });

  test("creates multiple artists for a track", async () => {
    const user = await createUser();

    await createSpotifyConnection(user.id);

    mockedFetchRecentTracks.mockResolvedValue([
      {
        userId: user.id,
        platformTrackId: "spotify-track-1",
        platformName: "spotify",
        playedAt: new Date("2026-01-01T12:00:00.000Z"),
        trackName: "Collaboration",
        albumName: "Album",
        durationMs: 200000,
        source: "get_recently_played",
        metadata: null,
        isrc: null,
        uploadedAt: new Date(),
        artists: [
          {
            platformId: "artist-1",
            name: "Artist One",
          },
          {
            platformId: "artist-2",
            name: "Artist Two",
          },
        ],
      },
    ]);

    const result = await spotifyGetHistoryHandler(user.id);

    expect(result.history[0]!.artists.artistsNames).toEqual([
      "Artist One",
      "Artist Two",
    ]);

    const artists = await prisma.artist.findMany();

    expect(artists).toHaveLength(2);

    const track = await prisma.track.findUnique({
      where: {
        id: result.history[0]!.track.trackId,
      },
      include: {
        artists: true,
      },
    });

    expect(track?.artists).toHaveLength(2);
  });

  test("reuses existing tracks and artists", async () => {
    const user = await createUser();

    await createSpotifyConnection(user.id);

    const existingTrack = await prisma.track.create({
      data: {
        trackName: "Existing Track",
        albumName: "Existing Album",
        durationMs: 200000,
        platformTracks: {
          create: {
            platformName: "spotify",
            platformTrackId: "spotify-track-1",
          },
        },
      },
    });

    const existingArtist = await prisma.artist.create({
      data: {
        name: "Existing Artist",
        platformArtists: {
          create: {
            platformName: "spotify",
            platformArtistId: "artist-1",
          },
        },
      },
    });

    mockedFetchRecentTracks.mockResolvedValue([
      {
        userId: user.id,
        platformTrackId: "spotify-track-1",
        platformName: "spotify",
        playedAt: new Date("2026-01-01T12:00:00.000Z"),
        trackName: "Existing Track",
        albumName: "Existing Album",
        durationMs: 200000,
        source: "get_recently_played",
        metadata: null,
        isrc: null,
        uploadedAt: new Date(),
        artists: [
          {
            platformId: "artist-1",
            name: "Existing Artist",
          },
        ],
      },
    ]);

    const result = await spotifyGetHistoryHandler(user.id);

    expect(result.history).toHaveLength(1);

    const tracks = await prisma.track.findMany();
    const artists = await prisma.artist.findMany();

    expect(tracks).toHaveLength(1);
    expect(artists).toHaveLength(1);

    expect(result.history[0]!.track.trackId).toBe(existingTrack.id);
    expect(result.history[0]!.artists.id).toEqual([existingArtist.id]);
  });

  test("does not process another user's connection", async () => {
    const user = await createUser();

    mockedFetchRecentTracks.mockResolvedValue([]);

    await expect(spotifyGetHistoryHandler(user.id)).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(mockedFetchRecentTracks).not.toHaveBeenCalled();
  });

  test("returns empty history when Spotify has no recent tracks", async () => {
    const user = await createUser();

    await createSpotifyConnection(user.id);

    mockedFetchRecentTracks.mockResolvedValue([]);

    const result = await spotifyGetHistoryHandler(user.id);

    expect(result.history).toEqual([]);

    expect(result.pagination).toEqual({
      limit: 50,
      offset: 0,
      total: 0,
      hasMore: false,
      nextOffset: null,
      previousOffset: null,
    });

    expect(await prisma.track.count()).toBe(0);
    expect(await prisma.artist.count()).toBe(0);

    expect(
      await prisma.listeningHistory.count({
        where: { userId: user.id },
      }),
    ).toBe(0);
  });
});
