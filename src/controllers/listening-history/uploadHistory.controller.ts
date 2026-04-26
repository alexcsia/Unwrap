import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { uploadHistoryService } from "@/services/listening-history/uploadHistory.service";

/**
 * POST /api/history/upload
 *
 * Endpoint for uploading extended listening history.
 * Requires an authenticated user and a supported platform (for example Spotify).
 * Expects a processed file (zip) with extracted data paths.
 * Triggers background ingestion of listening events.
 * Returns success message on completion.
 * Returns an unauthorized error if no user is authenticated.
 */

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

  await uploadHistoryService(filePath, extractedPath, user.id, platform);

  res.status(200).json({ message: "Listening history uploaded successfully" });
};
