import type { Request, Response, NextFunction } from "express";
import { getTopTracksService } from "@/services/top-tracks/getTopTracks";
import { ApiError } from "@/errors/ApiError";

/**
 * GET /api/top-tracks
 *
 * Endpoint for retrieving top tracks based on listening history.
 * Requires an authenticated user.
 * Supports time filters: year, month, date, from, to.
 * Supports pagination: limit and offset.
 * Returns tracks ranked by play count and listening duration.
 * Returns an unauthorized error if no user is authenticated.
 */

export const getTopTracksController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "User session not found or expired",
      );
    }

    const filters = {
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      date: req.query.date as string,
      from: req.query.from as string,
      to: req.query.to as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await getTopTracksService(req.user.id, filters);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
