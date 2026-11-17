import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { getUserConnections } from "@/models/connectedPlatforms";

export const listPlatformsController = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const connections = await getUserConnections(userId);

  res.json({ platforms: connections });
};
