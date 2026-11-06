import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { getPlatformAdapter } from "@/platforms/registry";
import type { Platform } from "@/models/connectedPlatforms/types";

export const platformCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:5173";

  try {
    const { platform } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, "UNAUTHENTICATED", "No authenticated user");
    }

    const adapter = getPlatformAdapter(platform as Platform);
    await adapter.handleCallback(userId, req.query);
    return res.redirect(
      `${FRONTEND}/platforms?connected=${adapter.platformName}`,
    );
  } catch (error: any) {
    console.error("Platform callback failed:", error);
    return res.redirect(`${FRONTEND}/platforms?error=oauth_failed`);
  }
};
