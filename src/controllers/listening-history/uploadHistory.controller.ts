import type { Request, Response } from "express";

import { uploadHistoryService } from "@/services/listening-history/uploadHistory.service";
export const uploadHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  console.log("File in processZipFile:", req.file);

  const { platform } = req;

  const user = req.user as {
    id: string;
    accessToken: string;
    refreshToken: string;
  };

  const { filePath, extractedPath } = req.filePaths!;

  await uploadHistoryService(filePath, extractedPath, user, platform);

  res.status(200).json({ message: "Listening history uploaded successfully" });
};
