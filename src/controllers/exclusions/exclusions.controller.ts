import type { Request, Response, NextFunction } from "express";
import * as ExclusionService from "@/services/exclusions/exclusions.service";

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

  const result = await ExclusionService.addExclusionService(req.user!.id, {
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

  await ExclusionService.removeExclusionService(req.user!.id, type!, targetId!);
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
  const result = await ExclusionService.getExclusionsService(req.user!.id);
  res.json(result);
};
