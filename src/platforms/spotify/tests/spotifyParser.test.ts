import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockedAddBulk = mock();

mock.module("@/lib/queue", () => ({
  historyQueue: {
    addBulk: mockedAddBulk,
  },
}));

const { processSpotifyEntries } = await import("../spotifyParser");

const USER_ID = "test-user-id";

function createSpotifyEntry(overrides: Partial<Record<string, any>> = {}) {
  return {
    ts: "2026-01-01T12:00:00Z",
    master_metadata_track_name: "Test Track",
    master_metadata_album_artist_name: "Test Artist",
    master_metadata_album_album_name: "Test Album",
    ms_played: 200000,
    spotify_track_uri: "spotify:track:track-123",
    ...overrides,
  };
}

describe("processSpotifyEntries", () => {
  beforeEach(() => {
    mockedAddBulk.mockReset();
    mockedAddBulk.mockResolvedValue([]);
  });

  test("transforms Spotify entries into queue jobs", async () => {
    const entry = createSpotifyEntry();

    await processSpotifyEntries([entry], USER_ID);

    expect(mockedAddBulk).toHaveBeenCalledTimes(1);

    const jobs = mockedAddBulk.mock.calls[0]![0];

    expect(jobs).toHaveLength(1);

    expect(jobs[0]).toMatchObject({
      name: "history-ingestion",
      data: {
        userId: USER_ID,
        platform: "spotify",
        entry: {
          userId: USER_ID,
          platformTrackId: "track-123",
          platformName: "spotify",
          playedAt: new Date("2026-01-01T12:00:00Z"),
          source: "spotify_upload",
        },
      },
      opts: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: {
          count: 1000,
        },
      },
    });
  });

  test("extracts the Spotify track ID from the URI", async () => {
    await processSpotifyEntries(
      [
        createSpotifyEntry({
          spotify_track_uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
        }),
      ],
      USER_ID,
    );

    const jobs = mockedAddBulk.mock.calls[0]![0];

    expect(jobs[0].data.entry.platformTrackId).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  });

  test("creates jobs in batches", async () => {
    const entries = Array.from({ length: 21 }, (_, index) =>
      createSpotifyEntry({
        spotify_track_uri: `spotify:track:track${index}`,
        ts: new Date(1700000000000 + index * 1000).toISOString(),
        ms_played: 60000,
      }),
    );

    await processSpotifyEntries(entries, USER_ID, 10);

    expect(mockedAddBulk).toHaveBeenCalledTimes(3);

    const allJobs = mockedAddBulk.mock.calls.flatMap((call) => call[0]);

    expect(allJobs).toHaveLength(21);
  });
});
