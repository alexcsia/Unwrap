import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { getPlatformAdapter } from "@/platforms/registry";

export const connectPlatformController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { platform } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "UNAUTHENTICATED", "No authenticated user");
    }
    if (!platform) {
      throw new ApiError(400, "BAD_REQUEST", "Missing platform");
    }

    const adapter = getPlatformAdapter(platform);
    const { redirectUrl } = await adapter.initiateOAuth(res, userId);
    res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
};
