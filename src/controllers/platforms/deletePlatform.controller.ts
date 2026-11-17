import { ApiError } from "@/errors/ApiError";
import type { Response, Request } from "express";
import { getPlatformAdapter } from "@/platforms/registry";
import type { Platform } from "@/models/connectedPlatforms";

export const deletePlatformController = async (req: Request, res: Response) => {
  const platform = req.platform;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const adapter = getPlatformAdapter(platform as Platform);
  await adapter.disconnect(userId);

  res.json({ message: "Platform successfully disconnected" });
};
