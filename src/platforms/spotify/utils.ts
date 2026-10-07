import type { SpotifyConnection } from "@/models/connectedPlatforms/types";
import { ApiError } from "@/errors/ApiError";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import { recentTracksInput } from "./validators";
import { refreshAccessToken as realRefresh } from "@/platforms/spotify/auth";
import { getRateLimitWait as realGetRateLimitWait } from "@/lib/spotify/rateLimit";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import z from "zod";

type RecentTracksInput = z.infer<typeof recentTracksInput>;

export type SpotifyHistoryItem = {
  platformTrackId: string;
  trackName: string;
  albumName: string;
  durationMs: number;
  playedAt: Date;
  platformName: string;
  source: string;
  uploadedAt: Date;
  metadata: unknown;
  isrc?: string;
  artists: { name: string; platformId: string }[];
};
export type SpotifyUtilsDeps = {
  createClient: (user: SpotifyConnection) => {
    player: {
      getRecentlyPlayedTracks: (limit: number, opts?: any) => Promise<any>;
    };
  };
  refreshAccessToken: (user: SpotifyConnection) => Promise<string>;
  getRateLimitWait: () => Promise<number | null>;
  fetch: typeof fetch; // consistent with the DI pattern
};

const defaultDeps: SpotifyUtilsDeps = {
  createClient: (user) =>
    SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID!, {
      access_token: user.accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: user.refreshToken,
    }) as any,
  refreshAccessToken: realRefresh,
  getRateLimitWait: realGetRateLimitWait,
  fetch: fetch.bind(globalThis),
};

export const createSpotifyUtils = (deps: SpotifyUtilsDeps = defaultDeps) => {
  const fetchRecentTracks = async (
    user: SpotifyConnection,
    cursor?: string,
  ): Promise<RecentTracksInput[]> => {
    const rateLimitWait = await deps.getRateLimitWait();
    if (rateLimitWait !== null) {
      throw new SpotifyRateLimitError(
        Math.ceil(rateLimitWait / 1000).toString(),
      );
    }

    try {
      const spotifyApi = deps.createClient(user);
      const recentTracks = await spotifyApi.player.getRecentlyPlayedTracks(
        50,
        cursor ? ({ after: Number(cursor) } as any) : undefined,
      );
      return recentTracks.items.map((item: any) => ({
        userId: user.userId,
        platformTrackId: item.track.id,
        platformName: "spotify",
        playedAt: new Date(item.played_at),
        trackName: item.track.name,
        albumName: item.track.album.name,
        durationMs: item.track.duration_ms,
        source: "get_recently_played",
        metadata: null,
        isrc: item.track.external_ids.isrc,
        uploadedAt: new Date(),
        artists: item.track.artists.map((artist: any) => ({
          platformId: artist.id,
          name: artist.name,
        })),
      }));
    } catch (error: any) {
      if (
        error?.response?.status === 401 ||
        error?.message?.includes("Bad or expired token")
      ) {
        const newAccessToken = await deps.refreshAccessToken(user);
        return fetchRecentTracks(
          { ...user, accessToken: newAccessToken },
          cursor,
        );
      }

      const status = error?.response?.status ?? error?.status;
      if (status === 429) {
        const retryAfter =
          error?.response?.headers?.["retry-after"] ??
          error?.headers?.["retry-after"];
        throw new SpotifyRateLimitError(retryAfter);
      }

      throw new ApiError(
        502,
        "SPOTIFY_API_ERROR",
        `Failed to fetch Spotify listening history: ${error}`,
      );
    }
  };

  const getSpotifyArtistIds = async (
    trackUri: string,
    connection: SpotifyConnection,
  ): Promise<{ platformId: string; name: string }[]> => {
    const trackId = trackUri.includes(":") ? trackUri.split(":")[2] : trackUri;

    if (!trackId) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `Invalid Spotify track URI: ${trackUri}`,
      );
    }

    const response = await deps.fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${connection.accessToken}` },
      },
    );

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");

      throw new SpotifyRateLimitError(retryAfter ?? undefined);
    }

    if (response.status === 401) {
      console.log(
        `[Spotify] Token expired for user ${connection.userId}, refreshing...`,
      );
      const newAccessToken = await deps.refreshAccessToken(connection);

      return getSpotifyArtistIds(trackUri, {
        ...connection,
        accessToken: newAccessToken,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.log(response.status);
      throw new ApiError(
        502,
        "SPOTIFY_API_ERROR",
        `Spotify API failed: ${text}`,
      );
    }

    const body = await response.json();

    if (!body?.artists) {
      console.warn(`[Spotify] No artist data found for track: ${trackId}`);
      return [];
    }

    return body.artists.map((artist: any) => ({
      platformId: artist.id,
      name: artist.name,
    }));
  };

  return { fetchRecentTracks, getSpotifyArtistIds };
};
export const { fetchRecentTracks, getSpotifyArtistIds } = createSpotifyUtils();
