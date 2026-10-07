import { ApiError } from "@/errors/ApiError";
import { getHistoryService } from "@/services/listeningHistory/getHistory.service";
import type { Request, Response } from "express";

/**
 * GET /api/history
 *
 * Endpoint for retrieving recent listening history from a streaming platform.
 * Requires an authenticated user and a configured platform (for example Spotify).
 * Fetches the latest listening events (up to 50 tracks).
 * Returns the history as an array of tracks.
 * Returns an unauthorized error if no user is authenticated.
 */

export const getHistoryController = async (req: Request, res: Response) => {
  const user = req.user;
  const { platform } = req;

  if (!user) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const history = await getHistoryService(user.id, platform);

  res.status(200).json({ history: history });
};
