import { beforeEach, describe, expect, test, mock } from "bun:test";

import { toUploadData } from "../../helpers";
import type { UploadData } from "@/workers/types";
import { toSpotifyDTOs } from "../../helpers";
import type { UploadArtist } from "@/workers/types";
const USER_ID = "user-123";

const baseRawEntry = {
  platformTrackId: "track-abc",
  platformName: "spotify",
  trackName: "Test Track",
  albumName: "Test Album",
  durationMs: 180000,
  source: "spotify_upload",
  playedAt: "2026-01-01T12:00:00Z",
  artists: [
    {
      name: "Test Artist",
      platformId: "spotify:artist:123",
    },
  ],
};

const findOrCreateTrack = mock();
const findOrCreateArtist = mock();
const connectArtistsAndTrack = mock();
const saveListeningHistory = mock();
const transaction = mock(async (fn: () => Promise<unknown>) => fn());

const getSpotifyArtistIdsMock = mock();
const redisSetMock = mock();

beforeEach(() => {
  findOrCreateTrack.mockReset();
  findOrCreateArtist.mockReset();
  connectArtistsAndTrack.mockReset();
  saveListeningHistory.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(async (fn: () => Promise<unknown>) => fn());

  getSpotifyArtistIdsMock.mockReset();
  redisSetMock.mockReset();
});

describe("toSpotifyDTOs", () => {
  test("should map UploadData and artists to Spotify DTOs", () => {
    const entry: UploadData = {
      userId: "user-123",
      platformTrackId: "track-123",
      platformName: "spotify",
      trackName: "Poker Face",
      albumName: "The Fame",
      durationMs: 238000,
      source: "upload",
      isrc: "USUM70807646",
      metadata: { foo: "bar" },
      playedAt: new Date("2024-08-17T10:38:00.000Z"),
      uploadedAt: new Date("2024-08-17T10:40:00.000Z"),
      artists: [],
    };

    const resolvedArtists: UploadArtist[] = [
      {
        platformId: "spotify-123",
        name: "Lady Gaga",
      },
    ];

    const result = toSpotifyDTOs(entry, resolvedArtists);

    expect(result).toEqual({
      track: {
        platformTrackId: "track-123",
        trackName: "Poker Face",
        albumName: "The Fame",
        durationMs: 238000,
        metadata: { foo: "bar" },
        isrc: "USUM70807646",
      },
      listeningHistory: {
        playedAt: entry.playedAt,
        platformName: "spotify",
        source: "upload",
        uploadedAt: entry.uploadedAt,
      },
      artists: [
        {
          name: "Lady Gaga",
          genres: [],
          imageUrl: undefined,
          platformId: "spotify-123",
        },
      ],
    });
  });

  test("should return empty artists when no artists are resolved", () => {
    const entry = {
      platformTrackId: "track-123",
      trackName: "Poker Face",
      albumName: "The Fame",
      durationMs: 238000,
      metadata: {},
      isrc: undefined,
      playedAt: new Date(),
      platformName: "spotify",
      source: "upload",
      uploadedAt: new Date(),
    } as UploadData;

    const result = toSpotifyDTOs(entry, []);

    expect(result.artists).toEqual([]);
  });
});

describe("toUploadData", () => {
  test("transforms valid raw entry with all fields", () => {
    const raw = {
      ...baseRawEntry,
      isrc: "US1234567890",
      uploadedAt: "2026-01-02T12:00:00Z",
      metadata: { key: "value" },
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result).toEqual({
      userId: USER_ID,
      platformTrackId: "track-abc",
      platformName: "spotify",
      trackName: "Test Track",
      albumName: "Test Album",
      durationMs: 180000,
      source: "spotify_upload",
      isrc: "US1234567890",
      metadata: { key: "value" },
      playedAt: new Date("2026-01-01T12:00:00Z"),
      uploadedAt: new Date("2026-01-02T12:00:00Z"),
      artists: [
        {
          platformId: "spotify:artist:123",
          name: "Test Artist",
        },
      ],
    });
  });

  test("defaults uploadedAt to current date when missing", () => {
    const before = Date.now();

    const result = toUploadData(USER_ID, baseRawEntry as any);

    const after = Date.now();

    expect(result.uploadedAt).toBeInstanceOf(Date);
    expect(result.uploadedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.uploadedAt.getTime()).toBeLessThanOrEqual(after);
  });

  test("defaults metadata to empty object and isrc to undefined when omitted", () => {
    const raw = {
      ...baseRawEntry,
      isrc: "",
      metadata: undefined,
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result.isrc).toBeUndefined();
    expect(result.metadata).toEqual({});
  });

  test("creates pending: platformId fallback when missing or stringified 'undefined'", () => {
    const raw = {
      ...baseRawEntry,
      artists: [
        {
          name: "Artist A",
          platformId: undefined,
        },
        {
          name: "Artist B",
          platformId: "undefined",
        },
        {
          name: "Artist C",
          platformId: "spotify:artist:456",
        },
      ],
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result.artists).toEqual([
      {
        name: "Artist A",
        platformId: "pending:Artist A",
      },
      {
        name: "Artist B",
        platformId: "pending:Artist B",
      },
      {
        name: "Artist C",
        platformId: "spotify:artist:456",
      },
    ]);
  });

  test("filters out artist records with missing or empty names", () => {
    const raw = {
      ...baseRawEntry,
      artists: [
        {
          name: "Valid Artist",
          platformId: "123",
        },
        {
          name: "",
          platformId: "456",
        },
        null,
        undefined,
      ],
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result.artists).toHaveLength(1);
    expect(result.artists[0]!.name).toBe("Valid Artist");
  });
});
