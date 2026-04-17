import type { Request, Response, NextFunction } from "express";
import * as ExclusionService from "@/services/exclusions/exclusions.service";

export const addExclusionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("Request body in addExclusionController:", req.body);

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
