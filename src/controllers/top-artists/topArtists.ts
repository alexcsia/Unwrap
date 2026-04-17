import type { Request, Response, NextFunction } from "express";
import { getTopArtistsService } from "@/services/top-artists/getTopArtists";
import { ApiError } from "@/errors/ApiError";

/**
 * GET /api/top-artists
 * Returns a user's top artists based on play count within a specific time range.
 */
export const getTopArtistsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
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

    if (filters.month && !filters.year) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Month filter requires a year to be specified",
      );
    }

    if ((filters.from && !filters.to) || (filters.to && !filters.from)) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "Custom ranges require both 'from' and 'to' dates",
      );
    }

    const result = await getTopArtistsService(userId, filters);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
