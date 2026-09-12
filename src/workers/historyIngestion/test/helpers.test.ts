import { describe, expect, test, beforeEach, mock } from "bun:test";
import { toUploadData } from "../helpers";
import { redisCache } from "@/lib/queue";
import type { ConnectedPlatforms } from "@prisma/client";
import type { UploadData } from "../../types";
import { CACHE_TTL_SEC } from "@/workers/shared/rateLimit";
import { toSpotifyDTOs } from "../helpers";
import type { UploadArtist } from "../../types";
import type {
  SpotifyArtistDTO,
  SpotifyListeningHistoryDTO,
  SpotifyTrackDTO,
} from "@/platforms/spotify/types";

const USER_ID = "user-123";

const baseRawEntry = {
  platformTrackId: "track-abc",
  platformName: "spotify",
  trackName: "Test Track",
  albumName: "Test Album",
  durationMs: 180000,
  source: "spotify_upload",
  playedAt: "2026-01-01T12:00:00Z",
  artists: [{ name: "Test Artist", platformId: "spotify:artist:123" }],
};

const redisSetMock = mock();

const getSpotifyArtistIdsMock = mock();

mock.module("@/platforms/spotify/utils", () => ({
  getSpotifyArtistIds: getSpotifyArtistIdsMock,
}));

import { fetchAndCacheSpotifyArtists } from "../helpers";

const mockFindOrCreateTrack = mock();
const mockFindOrCreateArtist = mock();
const mockConnectArtistsAndTrack = mock();
const mockSaveListeningHistory = mock();

mock.module("@/models/track.model", () => ({
  findOrCreateTrack: mockFindOrCreateTrack,
  connectArtistsAndTrack: mockConnectArtistsAndTrack,
}));

mock.module("@/models/artist.model", () => ({
  findOrCreateArtist: mockFindOrCreateArtist,
}));

mock.module("@/models/listeningHistory.model", () => ({
  saveListeningHistory: mockSaveListeningHistory,
}));

mock.module("@/utils/prisma.util", () => ({
  default: {
    $transaction: mock(async (fn: Function) => fn()),
  },
}));

const { saveHistoryRecords } = await import("../helpers");

const mockTrack: SpotifyTrackDTO = {
  platformTrackId: "sp-track-1",
  trackName: "Cruel Summer",
  albumName: "Lover",
  durationMs: 178000,
  metadata: null,
  isrc: "USUG11904257",
};

const mockArtists: SpotifyArtistDTO[] = [
  {
    name: "Taylor Swift",
    platformId: "sp-artist-1",
    genres: [],
    imageUrl: undefined,
  },
];

const mockListeningHistory: SpotifyListeningHistoryDTO = {
  playedAt: new Date("2024-06-01T12:00:00Z"),
  platformName: "spotify",
  source: "spotify_upload",
  uploadedAt: new Date(),
};

const mockEntry: UploadData = {
  userId: "user-123",
  platformTrackId: "sp-track-1",
  platformName: "spotify",
  trackName: "Cruel Summer",
  albumName: "Lover",
  durationMs: 178000,
  source: "spotify_upload",
  isrc: "USUG11904257",
  metadata: {},
  playedAt: new Date("2024-06-01T12:00:00Z"),
  uploadedAt: new Date(),
  artists: [{ platformId: "sp-artist-1", name: "Taylor Swift" }],
};

const userId = "user-123";

const mockSavedTrack = { id: "internal-track-id", trackName: "Cruel Summer" };
const mockSavedArtists = [{ id: "internal-artist-id", name: "Taylor Swift" }];

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
      artists: [{ platformId: "spotify:artist:123", name: "Test Artist" }],
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
    const raw = { ...baseRawEntry, isrc: "", metadata: undefined };
    const result = toUploadData(USER_ID, raw as any);

    expect(result.isrc).toBeUndefined();
    expect(result.metadata).toEqual({});
  });

  test("creates pending: platformId fallback when missing or stringified 'undefined'", () => {
    const raw = {
      ...baseRawEntry,
      artists: [
        { name: "Artist A", platformId: undefined },
        { name: "Artist B", platformId: "undefined" },
        { name: "Artist C", platformId: "spotify:artist:456" },
      ],
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result.artists).toEqual([
      { name: "Artist A", platformId: "pending:Artist A" },
      { name: "Artist B", platformId: "pending:Artist B" },
      { name: "Artist C", platformId: "spotify:artist:456" },
    ]);
  });

  test("filters out artist records with missing or empty names", () => {
    const raw = {
      ...baseRawEntry,
      artists: [
        { name: "Valid Artist", platformId: "123" },
        { name: "", platformId: "456" },
        null,
        undefined,
      ],
    };

    const result = toUploadData(USER_ID, raw as any);

    expect(result.artists).toHaveLength(1);
    expect(result.artists[0]!.name).toBe("Valid Artist");
  });
});

describe("fetchAndCacheSpotifyArtists", () => {
  beforeEach(() => {
    getSpotifyArtistIdsMock.mockReset();
    redisSetMock.mockReset();

    redisCache.set = redisSetMock as typeof redisCache.set;
  });

  test("should fetch, cache, and return Spotify artists", async () => {
    const artists = [
      { platformId: "spotify-123", name: "Lady Gaga" },
      { platformId: "spotify-456", name: "Bruno Mars" },
    ];

    getSpotifyArtistIdsMock.mockResolvedValue(artists);
    redisSetMock.mockResolvedValue("OK");

    const entry = {
      platformTrackId: "track-123",
    } as UploadData;

    const connection = {} as ConnectedPlatforms;

    const result = await fetchAndCacheSpotifyArtists(
      entry,
      connection,
      "spotify:artists:track-123",
    );

    expect(result).toEqual(artists);

    expect(redisSetMock).toHaveBeenCalledWith(
      "spotify:artists:track-123",
      JSON.stringify(artists),
      "EX",
      CACHE_TTL_SEC,
    );
  });

  test("should return an empty array when Spotify returns no artists", async () => {
    getSpotifyArtistIdsMock.mockResolvedValue([]);
    redisSetMock.mockResolvedValue("OK");

    const entry = {
      platformTrackId: "track-123",
    } as UploadData;

    const connection = {} as ConnectedPlatforms;

    const result = await fetchAndCacheSpotifyArtists(
      entry,
      connection,
      "spotify:artists:track-123",
    );

    expect(result).toEqual([]);

    expect(redisSetMock).toHaveBeenCalledWith(
      "spotify:artists:track-123",
      JSON.stringify([]),
      "EX",
      CACHE_TTL_SEC,
    );
  });
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

describe("saveHistoryRecords", () => {
  beforeEach(() => {
    mockFindOrCreateTrack.mockReset();
    mockFindOrCreateArtist.mockReset();
    mockConnectArtistsAndTrack.mockReset();
    mockSaveListeningHistory.mockReset();
  });

  test("saves a history record successfully", async () => {
    mockFindOrCreateTrack.mockResolvedValue(mockSavedTrack);
    mockFindOrCreateArtist.mockResolvedValue(mockSavedArtists);
    mockConnectArtistsAndTrack.mockResolvedValue(undefined);
    mockSaveListeningHistory.mockResolvedValue(undefined);

    await saveHistoryRecords(
      mockTrack,
      mockArtists,
      mockListeningHistory,
      mockEntry,
      userId,
    );

    expect(mockFindOrCreateTrack).toHaveBeenCalledWith(
      mockTrack,
      mockEntry.platformName,
    );

    expect(mockFindOrCreateArtist).toHaveBeenCalledWith(
      mockArtists,
      mockEntry.platformName,
    );

    expect(mockConnectArtistsAndTrack).toHaveBeenCalledWith(
      mockSavedTrack,
      mockSavedArtists,
    );

    expect(mockSaveListeningHistory).toHaveBeenCalledWith(
      mockListeningHistory,
      mockSavedTrack.id,
      userId,
    );
  });

  test("throws when the track cannot be found or created", async () => {
    mockFindOrCreateTrack.mockResolvedValue(null);

    await expect(
      saveHistoryRecords(
        mockTrack,
        mockArtists,
        mockListeningHistory,
        mockEntry,
        userId,
      ),
    ).rejects.toThrow(`Failed to find or create track: ${mockEntry.trackName}`);

    expect(mockFindOrCreateArtist).not.toHaveBeenCalled();
    expect(mockConnectArtistsAndTrack).not.toHaveBeenCalled();
    expect(mockSaveListeningHistory).not.toHaveBeenCalled();
  });

  test("propagates an error when saving artists fails", async () => {
    const error = new Error("Failed to save artists");

    mockFindOrCreateTrack.mockResolvedValue(mockSavedTrack);
    mockFindOrCreateArtist.mockRejectedValue(error);

    await expect(
      saveHistoryRecords(
        mockTrack,
        mockArtists,
        mockListeningHistory,
        mockEntry,
        userId,
      ),
    ).rejects.toThrow(error);

    expect(mockFindOrCreateTrack).toHaveBeenCalled();
    expect(mockConnectArtistsAndTrack).not.toHaveBeenCalled();
    expect(mockSaveListeningHistory).not.toHaveBeenCalled();
  });
});
