import { getPlatformAdapter } from "@/platforms/registry";
import { ApiError } from "@/errors/ApiError";

export const getHistoryService = async (userId: string, platform: string) => {
  const adapter = getPlatformAdapter(platform);
  if (!adapter) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  return await adapter.getHistory(userId);
};
