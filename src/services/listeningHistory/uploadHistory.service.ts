import { getPlatformAdapter } from "@/platforms/registry";
import { ApiError } from "@/errors/ApiError";

export const uploadHistoryService = async (
  filePath: string,
  extractedPath: string,
  userId: string,
  platform: string,
) => {
  const adapter = getPlatformAdapter(platform);

  if (!adapter) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  await adapter.uploadHistory(filePath, extractedPath, userId);
};
