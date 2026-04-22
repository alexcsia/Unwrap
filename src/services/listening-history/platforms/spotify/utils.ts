import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type { SpotifyUser } from "./types";
import { ApiError } from "@/errors/ApiError";
import { listeningHistorySchema } from "./validators";
import z from "zod";
import { refreshAccessToken } from "@/services/auth/platforms/spotify";
import type { ConnectedPlatforms } from "@prisma/client";

type ListeningHistoryDTO = z.infer<typeof listeningHistorySchema>;

export const fetchListeningHistory = async (
  user: SpotifyUser,
): Promise<ListeningHistoryDTO[]> => {
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

    const history = await spotifyApi.player.getRecentlyPlayedTracks(50);
    return history.items.map((item) => ({
      userId: user.userId,
      platformTrackId: item.track.id,
      platformName: "spotify",
      playedAt: new Date(item.played_at),
      trackName: item.track.name,
      albumName: item.track.album.name,
      durationMs: item.track.duration_ms,
      source: "get_recently_played",
      metadata: {},
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

      return fetchListeningHistory({
        ...user,
        AccessToken: newAccessToken,
      });
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
): Promise<{ id: string; name: string }[]> => {
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
    const retryAfter = Number(response.headers.get("retry-after")) || 30;
    const error: any = new ApiError(
      429,
      "SPOTIFY_API_ERROR",
      "Rate limit exceeded",
    );
    error.retryAfter = retryAfter;
    throw error;
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
    id: artist.id,
    name: artist.name,
  }));
};
