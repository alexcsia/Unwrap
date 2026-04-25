import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { uploadHistoryService } from "@/services/listening-history/uploadHistory.service";

export const uploadHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("File in processZipFile:", req.file);

  const { platform } = req;

  const user = req.user;

  if (!user) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const { filePath, extractedPath } = req.filePaths!;

  console.log("User ID:", user.id);
  console.log("File path:", filePath);
  console.log("Extracted path:", extractedPath);
  console.log("Platform:", platform);

  await uploadHistoryService(filePath, extractedPath, user.id, platform);

  res.status(200).json({ message: "Listening history uploaded successfully" });
};
