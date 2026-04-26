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
  try {
    const result = await ExclusionService.addExclusionService(req.user!.id, {
      type: req.body.type,
      targetId:
        req.body.artistId ||
        req.body.trackId ||
        req.body.id ||
        req.body.targetId,
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
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
  req: Request<{}, {}, {}, { type: string; id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { type, id } = req.query;
    await ExclusionService.removeExclusionService(req.user!.id, type, id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
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
  try {
    const result = await ExclusionService.getExclusionsService(req.user!.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};
