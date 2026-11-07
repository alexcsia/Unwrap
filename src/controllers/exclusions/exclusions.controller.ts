import type { Request, Response, NextFunction } from "express";
import * as ExclusionService from "@/services/exclusions/exclusions.service";
import { ApiError } from "@/errors/ApiError";
/**
 * POST /api/exclusions
 *
 * Endpoint for creating an exclusion. Requires an authenticated user.
 * Expects type and targetId (artistId or trackId) in the request body.
 * Creates an exclusion record
 */

export const addExclusionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { type, targetId } = req.params;

  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const result = await ExclusionService.addExclusionService(userId, {
    type: type as "artist" | "track",
    targetId: targetId as string,
  });

  res.status(201).json(result);
};

/**
 * DELETE /api/exclusions
 *
 * Endpoint for removing an exclusion. Requires an authenticated user.
 * Expects type and id as query parameters.
 * Deletes the matching exclusion record.
 * Returns 204 on success.
 */
export const deleteExclusionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { type, targetId } = req.params;

  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  await ExclusionService.removeExclusionService(userId, type!, targetId!);
  res.status(204).send();
};

/**
 * GET /api/exclusions
 *
 * Endpoint for retrieving user exclusions. Requires an authenticated user.
 * Returns all exclusions for the user.
 */

export const getExclusionsController = async (
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
  const result = await ExclusionService.getExclusionsService(userId);
  res.json(result);
};
