import { beforeEach, describe, expect, test, mock } from "bun:test";

import { createFetchAndCacheSpotifyArtists } from "../../helpers";
import { CACHE_TTL_SEC } from "@/workers/shared/rateLimit";
import type { UploadData } from "../../../types";

import type { SpotifyConnection } from "@/models/connectedPlatforms/types";

const findOrCreateTrack = mock();
const findOrCreateArtist = mock();
const connectArtistsAndTrack = mock();
const saveListeningHistory = mock();
const transaction = mock(async (fn: () => Promise<unknown>) => fn());

const getSpotifyArtistIdsMock = mock();
const redisSetMock = mock();

const fetchAndCacheSpotifyArtists = createFetchAndCacheSpotifyArtists({
  getSpotifyArtistIds: getSpotifyArtistIdsMock as any,
  cache: { set: redisSetMock as any },
  cacheTtlSec: CACHE_TTL_SEC,
});

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

describe("fetchAndCacheSpotifyArtists", () => {
  test("should fetch, cache, and return Spotify artists", async () => {
    const artists = [
      {
        platformId: "spotify-123",
        name: "Lady Gaga",
      },
      {
        platformId: "spotify-456",
        name: "Bruno Mars",
      },
    ];

    getSpotifyArtistIdsMock.mockResolvedValue(artists);
    redisSetMock.mockResolvedValue("OK");

    const entry = {
      platformTrackId: "track-123",
    } as UploadData;

    const connection = {} as SpotifyConnection;

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

    const connection = {} as SpotifyConnection;

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
