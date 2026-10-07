import { ApiError } from "@/errors/ApiError";
import prisma from "@/utils/prisma.util";
import { addConnection } from "@/models/connectedPlatforms/connectedPlatforms.model";
import type { SpotifyConnection } from "../../models/connectedPlatforms/types";
import { pollQueue } from "@/lib/queue";
import type { TokenExchangeResult } from "../types";
import querystring from "querystring";
import type { Response, Request } from "express";
import { consumeOAuthState, createOAuthState } from "../shared/auth";

/**
 * Service: exchangeSpotifyCode
 *
 * Exchanges Spotify OAuth code for access tokens.
 *
 * Flow:
 * - Sends authorization code to Spotify token endpoint
 * - Retrieves access_token, refresh_token, expires_in
 * - Fetches Spotify user profile (/v1/me)
 * - Stores or updates platform connection in database
 *
 * Behavior:
 * - Throws error if token exchange fails
 * - Throws error if Spotify profile fetch fails
 *
 * Returns:
 * - access_token
 * - refresh_token
 * - expires_in
 */

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
    const body = await response.text().catch(() => "<unreadable>");

    console.error("[spotify] token exchange failed", {
      status: response.status,
      body,
    });
    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Failed to exchange code for token",
    );
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_in } = data;

  if (!access_token || !expires_in) {
    throw new ApiError(
      502,
      "SPOTIFY_API_ERROR",
      "Spotify token response missing required fields",
    );
  }

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

    console.error("[spotify] profile fetch failed", {
      status,
      statusText,
      errorDetail,
    });

    throw new ApiError(
      status || 502,
      "SPOTIFY_API_ERROR",
      `Spotify Profile Fetch Failed (${status}): ${statusText || "Unknown Error"}`,
    );
  }

  const spotifyUserData = await userResponse.json();

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  const userConnectedPlatform = await prisma.connectedPlatforms.upsert({
    where: {
      userId_platformName: {
        userId,
        platformName: "spotify",
      },
    },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      platformUserId: spotifyUserData.id,
      connectedAt: new Date(),
    },
    create: {
      userId,
      platformName: "spotify",
      platformUserId: spotifyUserData.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      connectedAt: new Date(),
    },
  });

  await pollQueue.add(
    `poll:${userConnectedPlatform.userId}`,
    { userId: userConnectedPlatform.userId, platform: "spotify" },
    {
      // repeat: { every: 30 * 60 * 1000 }, //30 min
      repeat: { every: 1 * 60 * 1000 },
      jobId: `poll:${userId}:spotify`, // deduplicates, safe to call on reconnect
      delay: Math.floor(Math.random() * 30 * 60 * 1000), // random offset within 30 min window
    },
  );

  return { access_token, refresh_token, expires_in };
};

/**
 * Service: refreshAccessToken
 *
 * Refreshes Spotify access token using stored refresh token.
 *
 * Flow:
 * - Sends refresh_token to Spotify token endpoint
 * - Receives new access_token (and optionally refresh_token)
 * - Updates stored connection in database
 *
 * Behavior:
 * - Throws error if refresh request fails
 * - Falls back to existing refresh token if not returned
 *
 * Returns:
 * - new access_token
 */

export const refreshAccessToken = async (
  user: SpotifyConnection,
): Promise<string> => {
  const tokenEndpoint = "https://accounts.spotify.com/api/token";

  console.log("Refreshing Spotify access token for user:", user);

  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: user.refreshToken,
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
  const newRefreshToken = data.refresh_token || user.refreshToken;
  const expiresIn = data.expires_in;

  await addConnection(user.userId, newAccessToken, newRefreshToken, expiresIn);

  return newAccessToken;
};

export const initiateOAuth = async (
  res: Response,
  userId: string,
): Promise<{ redirectUrl: string }> => {
  const state = await createOAuthState(userId, "spotify");
  const scope = "user-read-email user-read-recently-played";
  return {
    redirectUrl:
      "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        scope,
        redirect_uri: process.env.SPOTIFY_CALLBACK_URI!,
        state,
      }),
  };
};

export const revokeSpotifyToken = async (
  accessToken: string,
): Promise<void> => {};

export const disconnectSpotify = async (userId: string): Promise<void> => {};

export const handleSpotifyCallback = async (
  userId: string,
  query: Request["query"],
): Promise<{ success: boolean; message: string }> => {
  const code = query.code;
  const state = query.state;

  if (typeof state !== "string" || state.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "Invalid or missing OAuth state");
  }

  const ok = await consumeOAuthState(userId, "spotify", state);
  if (!ok) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Cached state does not match current user and/or platform",
    );
  }

  if (typeof code !== "string" || code.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "Missing authorization code");
  }

  await exchangeSpotifyCode(userId, code);

  return { success: true, message: "Spotify connected" };
};
