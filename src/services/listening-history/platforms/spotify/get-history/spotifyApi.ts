import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import prisma from "@/utils/prisma.util";
import { ApiError } from "@/errors/ApiError";

interface SpotifyUser {
  id: string;
  accessToken: string;
  refreshToken: string;
}

interface ListeningHistoryItem {
  trackId: string;
  playedAt: Date;
  trackName: string;
  artistName: string;
  albumName: string;
  durationMs: number;
}

export const fetchListeningHistory = async (
  user: SpotifyUser,
): Promise<ListeningHistoryItem[]> => {
  try {
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID!,
      {
        access_token: user.accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: user.refreshToken,
      },
    );

    const history = await spotifyApi.player.getRecentlyPlayedTracks(50);

    return history.items.map((item) => ({
      trackId: item.track.id,
      playedAt: new Date(item.played_at),
      trackName: item.track.name,
      artistName: item.track.artists[0]!.name,
      albumName: item.track.album.name,
      durationMs: item.track.duration_ms,
    }));
  } catch (error: any) {
    if (
      error?.response?.status === 401 ||
      error?.message?.includes("Bad or expired token")
    ) {
      const newAccessToken = await refreshAccessToken(user);

      return fetchListeningHistory({
        ...user,
        accessToken: newAccessToken,
      });
    }

    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Failed to fetch Spotify listening history",
    );
  }
};

export const refreshAccessToken = async (
  user: SpotifyUser,
): Promise<string> => {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: user.refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Failed to refresh Spotify access token",
    );
  }

  const data = await response.json();
  const newAccessToken = data.access_token;

  await prisma.connectedPlatforms.update({
    where: {
      userId_platformName: {
        userId: user.id,
        platformName: "spotify",
      },
    },
    data: {
      AccessToken: newAccessToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return newAccessToken;
};
