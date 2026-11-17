import type { Response, Request, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { searchEntityService } from "@/services/listeningHistory/searchEntity.service";

export const searchEntityController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.id;
  const { type, name, limit, cursor } = req.query;

  console.log(type, name, limit, cursor);

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  if (typeof type !== "string" || typeof name !== "string" || !type || !name) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Type and name query parameters must be valid strings",
    );
  }

  if (type !== "track" && type !== "artist") {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Type must be either 'track' or 'artist'",
    );
  }

  if (!limit) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Limit query parameter is missing or invalid",
    );
  }

  const parsedLimit = parseInt(limit as string, 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    throw new ApiError(400, "BAD_REQUEST", "Limit must be a positive integer");
  }

  const parsedCursor = typeof cursor === "string" ? cursor : undefined;

  const result = await searchEntityService(
    type,
    name,
    parsedLimit,
    parsedCursor,
    userId,
  );

  res.json({ result: result });
};
