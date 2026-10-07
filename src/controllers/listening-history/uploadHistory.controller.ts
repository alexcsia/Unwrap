import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { uploadHistoryService } from "@/services/listeningHistory/uploadHistory.service";

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
  const { platform } = req.params;

  if (!platform)
    throw new ApiError(
      400,
      "MISSING_PLATFORM",
      "Streaming platform is missing from the request",
    );

  const user = req.user;
  if (!user || !user.id) {
    throw new ApiError(401, "UNAUTHORIZED", "User ID missing from session");
  }

  const { filePath, extractedPath } = req.filePaths!;

  await uploadHistoryService(filePath, extractedPath, user.id, platform);

  res.status(200).json({ message: "Listening history uploaded successfully" });
};
