import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { exchangeSpotifyCode } from "@/services/auth/platforms/spotify";
import querystring from "querystring";

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
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    });
  } catch (error) {
    next(error);
  }
};
