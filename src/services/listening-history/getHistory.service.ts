import { getHistoryHandlers } from "./platformRegistry";
import { ApiError } from "@/errors/ApiError";

export const getHistoryService = async (userId: string, platform: string) => {
  const handler =
    getHistoryHandlers[platform as keyof typeof getHistoryHandlers];
  if (!handler) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  return await handler(userId);
};
