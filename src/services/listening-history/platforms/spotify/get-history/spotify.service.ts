import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import axios from "axios";
import prisma from "../../../../../utils/prisma.util";

export const fetchListeningHistory = async (user: any): Promise<any> => {
  let accessToken = user.accessToken;

  try {
    const spotifyApi = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID!,
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: user.refreshToken,
      },
    );

    const history = await spotifyApi.player.getRecentlyPlayedTracks(50);

    return history.items.map((item: any) => ({
      trackId: item.track.id,
      playedAt: new Date(item.played_at),
      trackName: item.track.name,
      artistName: item.track.artists[0].name,
      albumName: item.track.album.name,
      durationMs: item.track.duration_ms,
    }));
  } catch (error: any) {
    if (
      error.response?.status === 401 ||
      error.message.includes("Bad or expired token")
    ) {
      console.log(
        `Access token expired for user: ${user.id}. Attempting to refresh token...`,
      );
      accessToken = await refreshAccessToken(user);

      console.log(`Retrying fetch with refreshed token for user: ${user.id}`);
      return fetchListeningHistory({ ...user, accessToken });
    }

    console.error(
      `Error fetching listening history for user ${user.id}:`,
      error,
    );
    throw error;
  }
};

export const refreshAccessToken = async (user: any) => {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token } = response.data;

    await prisma.user.update({
      where: { id: user.id },
      data: { accessToken: access_token },
    });

    console.log(`Access token refreshed for user: ${user.id}`);
    return access_token;
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
    throw error;
  }
};
