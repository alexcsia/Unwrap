import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { exchangeSpotifyCode } from "@/services/auth/platforms/spotify";
import querystring from "querystring";

/**
 * GET /auth/spotify/callback
 *
 * Endpoint for handling Spotify OAuth callback.
 * Expects query parameters: code and state.
 * Validates state and exchanges code for Spotify tokens.
 * Returns access and refresh tokens with expiration.
 * Redirects with error if state is missing.
 * Returns error if code is missing.
 */
export const spotifyCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!state) {
      return res.redirect(
        "/#" + querystring.stringify({ error: "state_mismatch" }),
      );
    }

    if (!code) {
      throw new ApiError(400, "BAD_REQUEST", "Missing authorization code");
    }

    const userId = req.user!.id;
    const result = await exchangeSpotifyCode(userId, code);

    res.json({
      success: true,
      message: "Spotify account connected successfully.",
      platform: "spotify",
    });
  } catch (error) {
    next(error);
  }
};
