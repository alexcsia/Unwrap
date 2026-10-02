import { getPlatformAdapter } from "@/platforms/registry";
import { ApiError } from "@/errors/ApiError";
import type { Platform } from "@/models/connectedPlatforms/types";

export const uploadHistoryService = async (
  filePath: string,
  extractedPath: string,
  userId: string,
  platform: Platform,
) => {
  const adapter = getPlatformAdapter(platform);

  if (!adapter || !adapter.uploadHistory) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  await adapter.uploadHistory(filePath, extractedPath, userId);
};
