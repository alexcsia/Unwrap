import { describe, test, expect, beforeEach, mock } from "bun:test";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import type { SpotifyConnection } from "@/models/connectedPlatforms/types";
import { createSpotifyUtils } from "../utils";

const createClient = mock();
const refreshAccessToken = mock();
const getRateLimitWait = mock(async () => null);
const fetchMock = mock();

const { fetchRecentTracks, getSpotifyArtistIds } = createSpotifyUtils({
  createClient: createClient as any,
  refreshAccessToken: refreshAccessToken as any,
  getRateLimitWait: getRateLimitWait as any,
  fetch: fetchMock as any,
});

const user: SpotifyConnection = {
  userId: "user-123",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  platformName: "spotify",
  platformUserId: "spotify-user-123",
  expiresAt: new Date(Date.now() + 3600 * 1000),
} as any;

const mockSpotifyTrack = {
  track: {
    id: "sp-track-1",
    name: "Superstitious",
    album: { name: "Talking Book" },
    duration_ms: 245000,
    external_ids: { isrc: "USMO17200123" },
    artists: [{ id: "sp-artist-1", name: "Stevie Wonder" }],
  },
  played_at: "2024-06-01T12:00:00Z",
};

const mockSpotifyResponse = {
  items: [mockSpotifyTrack],
  cursors: {
    after: "1717243200000",
    before: "1717243200000",
  },
};

let getRecentlyPlayedTracks: ReturnType<typeof mock>;

beforeEach(() => {
  getRecentlyPlayedTracks = mock(async () => mockSpotifyResponse);

  createClient.mockReset();
  createClient.mockReturnValue({
    player: { getRecentlyPlayedTracks },
  });

  refreshAccessToken.mockReset();
  getRateLimitWait.mockReset();
  getRateLimitWait.mockResolvedValue(null);
  fetchMock.mockReset();
});

describe("fetchRecentTracks", () => {
  beforeEach(() => {
    getRecentlyPlayedTracks.mockClear();
    refreshAccessToken.mockClear();

    getRecentlyPlayedTracks.mockResolvedValue(mockSpotifyResponse);
  });

  describe("happy path", () => {
    test("returns mapped tracks from Spotify response", async () => {
      const result = await fetchRecentTracks(user);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: "user-123",
        platformTrackId: "sp-track-1",
        platformName: "spotify",
        trackName: "Superstitious",
        albumName: "Talking Book",
        durationMs: 245000,
        isrc: "USMO17200123",
        source: "get_recently_played",
      });
    });

    test("maps artists correctly", async () => {
      const result = await fetchRecentTracks(user);

      expect(result[0]!.artists).toEqual([
        { platformId: "sp-artist-1", name: "Stevie Wonder" },
      ]);
    });

    test("converts played_at string to Date", async () => {
      const result = await fetchRecentTracks(user);

      expect(result[0]!.playedAt).toBeInstanceOf(Date);
      expect(result[0]!.playedAt.toISOString()).toBe(
        "2024-06-01T12:00:00.000Z",
      );
    });

    test("returns empty array when Spotify returns no tracks", async () => {
      getRecentlyPlayedTracks.mockResolvedValue({ items: [] });

      const result = await fetchRecentTracks(user);

      expect(result).toHaveLength(0);
    });

    test("passes cursor to Spotify API when provided", async () => {
      await fetchRecentTracks(user, "1717243200000");

      expect(getRecentlyPlayedTracks).toHaveBeenCalledWith(
        50,
        expect.objectContaining({ after: 1717243200000 }),
      );
    });

    test("passes undefined to Spotify API when no cursor provided", async () => {
      await fetchRecentTracks(user);

      expect(getRecentlyPlayedTracks).toHaveBeenCalledWith(50, undefined);
    });
  });

  describe("401 token refresh", () => {
    test("refreshes token and retries on 401 response status", async () => {
      getRecentlyPlayedTracks
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(mockSpotifyResponse);

      refreshAccessToken.mockResolvedValue("new-access-token");

      const result = await fetchRecentTracks(user);

      expect(refreshAccessToken).toHaveBeenCalledWith(user);
      expect(getRecentlyPlayedTracks).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });

    test("refreshes token and retries on bad or expired token message", async () => {
      getRecentlyPlayedTracks
        .mockRejectedValueOnce({ message: "Bad or expired token" })
        .mockResolvedValueOnce(mockSpotifyResponse);

      refreshAccessToken.mockResolvedValue("new-access-token");

      await fetchRecentTracks(user);

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(getRecentlyPlayedTracks).toHaveBeenCalledTimes(2);
    });

    test("retries with new access token after refresh", async () => {
      getRecentlyPlayedTracks
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(mockSpotifyResponse);

      refreshAccessToken.mockResolvedValue("new-access-token");

      await fetchRecentTracks(user);

      expect(refreshAccessToken).toHaveBeenCalledWith(user);
    });
  });

  describe("429 rate limiting", () => {
    test("throws SpotifyRateLimitError on 429 response status", async () => {
      getRecentlyPlayedTracks.mockRejectedValue({
        response: { status: 429, headers: { "retry-after": "30" } },
      });

      await expect(fetchRecentTracks(user)).rejects.toBeInstanceOf(
        SpotifyRateLimitError,
      );
    });

    test("extracts retry-after from response headers", async () => {
      getRecentlyPlayedTracks.mockRejectedValue({
        response: { status: 429, headers: { "retry-after": "60" } },
      });

      try {
        await fetchRecentTracks(user);
      } catch (err) {
        expect(err).toBeInstanceOf(SpotifyRateLimitError);
        expect((err as SpotifyRateLimitError).retryAfter).toBe(60);
      }
    });

    test("defaults retryAfter to 30 when header is missing", async () => {
      getRecentlyPlayedTracks.mockRejectedValue({
        response: { status: 429, headers: {} },
      });

      try {
        await fetchRecentTracks(user);
      } catch (err) {
        expect(err).toBeInstanceOf(SpotifyRateLimitError);
        expect((err as SpotifyRateLimitError).retryAfter).toBe(30);
      }
    });
  });
});

describe("getSpotifyArtistIds", () => {
  test("throws 400 on an invalid track URI", async () => {
    await expect(getSpotifyArtistIds("", user)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("returns mapped artists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        artists: [{ id: "sp-artist-1", name: "Stevie Wonder" }],
      }),
    } as any);

    const result = await getSpotifyArtistIds("spotify:track:abc", user);

    expect(result).toEqual([
      { platformId: "sp-artist-1", name: "Stevie Wonder" },
    ]);
  });

  test("refreshes on 401 and retries with the new token", async () => {
    refreshAccessToken.mockResolvedValue("new-token");
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ artists: [{ id: "a1", name: "A" }] }),
      } as any);

    const result = await getSpotifyArtistIds("spotify:track:abc", user);

    expect(refreshAccessToken).toHaveBeenCalledWith(user);
    expect(result).toEqual([{ platformId: "a1", name: "A" }]);
  });

  test("throws SpotifyRateLimitError on 429", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "12" }),
    } as any);

    await expect(
      getSpotifyArtistIds("spotify:track:abc", user),
    ).rejects.toBeInstanceOf(SpotifyRateLimitError);
  });

  test("throws a 502 on other failures", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "boom",
    } as any);

    await expect(
      getSpotifyArtistIds("spotify:track:abc", user),
    ).rejects.toMatchObject({ statusCode: 502, code: "SPOTIFY_API_ERROR" });
  });
});
