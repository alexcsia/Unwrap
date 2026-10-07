import { getPlatformAdapter } from "@/platforms/registry";
import { ApiError } from "@/errors/ApiError";
import type { Platform } from "@/models/connectedPlatforms/types";

export const getHistoryService = async (userId: string, platform: Platform) => {
  const adapter = getPlatformAdapter(platform);
  if (!adapter || !adapter.getHistory) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  return await adapter.getHistory(userId);
};
