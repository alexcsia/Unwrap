import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { getPlatformAdapter } from "@/platforms/registry";
import { getUserConnections } from "@/models/connectedPlatforms";

export const listPlatformsController = async (req: Request, res: Response) => {
  const platform = req.platform;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  getPlatformAdapter(platform);
  const connections = await getUserConnections(userId);

  res.json({ platforms: connections });
};
