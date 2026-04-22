import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { timeListenedService } from "@/services/time-listened/time-listened";

export const timeListenedController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

  const result = await timeListenedService(userId, filters);

  res.status(200).json(result);
};
