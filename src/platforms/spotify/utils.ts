import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type { UserConnectedPlatforms } from "../../services/listeningHistory/types";
import { ApiError } from "@/errors/ApiError";
import { recentTracksInput } from "./validators";
import z from "zod";
import { refreshAccessToken } from "@/platforms/spotify/auth";
import { type ConnectedPlatforms } from "@prisma/client";
import { SpotifyRateLimitError } from "@/errors/spotifyRateLimitError";
import { getRateLimitWait } from "@/lib/spotify/rateLimit";

type recentTracksInput = z.infer<typeof recentTracksInput>;

export const fetchRecentTracks = async (
  user: UserConnectedPlatforms,
  cursor?: string, // timestamp in ms from redis
): Promise<recentTracksInput[]> => {
  const rateLimitWait = await getRateLimitWait();

  if (rateLimitWait !== null) {
    throw new SpotifyRateLimitError(Math.ceil(rateLimitWait / 1000).toString());
  }

  try {
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID!,
      {
        access_token: user.AccessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: user.RefreshToken,
      },
    );

    const recentTracks = await spotifyApi.player.getRecentlyPlayedTracks(
      50,
      cursor ? ({ after: Number(cursor) } as any) : undefined,
    );
    return recentTracks.items.map((item) => ({
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

      artists: item.track.artists.map((artist) => ({
        platformId: artist.id,
        name: artist.name,
      })),
    }));
  } catch (error: any) {
    if (
      error?.response?.status === 401 ||
      error?.message?.includes("Bad or expired token")
    ) {
      const newAccessToken = await refreshAccessToken(user);

      return fetchRecentTracks(
        { ...user, AccessToken: newAccessToken },
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
      "Failed to fetch Spotify listening history",
    );
  }
};

export const getSpotifyArtistIds = async (
  trackUri: string,
  connection: ConnectedPlatforms,
): Promise<{ platformId: string; name: string }[]> => {
  const trackId = trackUri.includes(":") ? trackUri.split(":")[2] : trackUri;

  if (!trackId) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `Invalid Spotify track URI: ${trackUri}`,
    );
  }

  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${connection.AccessToken}` },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");

    throw new SpotifyRateLimitError(retryAfter ?? undefined);
  }

  if (response.status === 401) {
    console.log(
      `[Spotify] Token expired for user ${connection.userId}, refreshing...`,
    );
    const newAccessToken = await refreshAccessToken(connection);

    return getSpotifyArtistIds(trackUri, {
      ...connection,
      AccessToken: newAccessToken,
    });
  }

  if (!response.ok) {
    const text = await response.text();
    console.log(response.status);
    throw new ApiError(502, "SPOTIFY_API_ERROR", `Spotify API failed: ${text}`);
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
