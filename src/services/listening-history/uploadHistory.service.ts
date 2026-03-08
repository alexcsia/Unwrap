import { uploadHandlers } from "./platformRegistry";
import { ApiError } from "../../errors/ApiError";

export const uploadHistoryService = async (
  filePath: string,
  extractedPath: string,
  user: { id: string },
  platform: string,
) => {
  const handler = uploadHandlers[platform as keyof typeof uploadHandlers];
  if (!handler) {
    throw new ApiError(400, "UNSUPPORTED_PLATFORM", "Unsupported platform");
  }
  await handler(filePath, extractedPath, user.id);
};
