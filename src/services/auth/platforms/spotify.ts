import { ApiError } from "@/errors/ApiError";
import prisma from "@/utils/prisma.util";
import { addConnection } from "@/models/connectedPlatforms";
import type { SpotifyUser } from "../../listening-history/platforms/spotify/types";

interface TokenExchangeResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const exchangeSpotifyCode = async (
  userId: string,
  code: string,
): Promise<TokenExchangeResult> => {
  const redirect_uri = process.env.SPOTIFY_CALLBACK_URI!;
  const client_id = process.env.SPOTIFY_CLIENT_ID!;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET!;

  const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString(
    "base64",
  );

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Failed to exchange code for token",
    );
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_in } = data;

  const userResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userResponse.ok) {
    const status = userResponse.status;
    const statusText = userResponse.statusText;

    let errorDetail = "";
    try {
      errorDetail = await userResponse.text();
    } catch (e) {
      errorDetail = "Could not parse error body";
    }

    throw new ApiError(
      status || 502,
      "SPOTIFY_API_ERROR",
      `Spotify Profile Fetch Failed (${status}): ${statusText || "Unknown Error"}`,
    );
  }

  const spotifyUserData = await userResponse.json();

  await prisma.connectedPlatforms.upsert({
    where: {
      userId_platformName: {
        userId,
        platformName: "spotify",
      },
    },
    update: {
      AccessToken: access_token,
      RefreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      platformUserId: spotifyUserData.id,
      connectedAt: new Date(),
    },
    create: {
      userId,
      platformName: "spotify",
      platformUserId: spotifyUserData.id,
      AccessToken: access_token,
      RefreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      connectedAt: new Date(),
    },
  });

  return { access_token, refresh_token, expires_in };
};

export const refreshAccessToken = async (
  user: SpotifyUser,
): Promise<string> => {
  const tokenEndpoint = "https://accounts.spotify.com/api/token";

  console.log("Refreshing Spotify access token for user:", user);

  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: user.RefreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    console.error("Spotify Refresh Error:", errorBody);
    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Failed to refresh Spotify access token",
    );
  }

  const data = await response.json();

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token || user.RefreshToken;
  const expiresIn = data.expires_in;

  await addConnection(user.userId, newAccessToken, newRefreshToken, expiresIn);

  return newAccessToken;
};
