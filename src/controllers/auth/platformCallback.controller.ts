import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { getPlatformAdapter } from "@/platforms/registry";

export const platformCallbackController = async (
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

    const adapter = getPlatformAdapter(platform!);
    await adapter.handleCallback(userId, req.query);

    res.json({
      success: true,
      message: `${platform} account connected successfully.`,
      platform,
    });
  } catch (error) {
    next(error);
  }
};
