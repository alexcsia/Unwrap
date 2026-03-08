import { ApiError } from "../errors/ApiError";

import type { Request, Response, NextFunction } from "express";

const allowedPlatforms = ["spotify", "tidal", "apple_music"];

export const validatePlatform = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { platform } = req.params;

  if (!platform) {
    throw new ApiError(
      400,
      "MISSING_PLATFORM",
      "Platform parameter is missing",
    );
  }
  if (!allowedPlatforms.includes(platform)) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }

  req.platform = platform;

  next();
};
