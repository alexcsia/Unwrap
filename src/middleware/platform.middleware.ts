import { ApiError } from "@/errors/ApiError";
import type { Request, Response, NextFunction } from "express";
import { allowedPlatforms } from "../platforms/types";
import type { Platform } from "../platforms/types";

/**
 * Middleware: validatePlatform
 *
 * Validates streaming platform from request parameters.
 * Ensures platform is supported before request continues.
 *
 * Behavior:
 * - Throws 400 if platform is missing
 * - Throws 400 if platform is unsupported
 * - Attaches platform to req.platform
 */

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

  if (!allowedPlatforms.includes(platform as Platform)) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }

  req.platform = platform as Platform;
  next();
};
