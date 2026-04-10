import { ApiError } from "@/errors/ApiError";
import { getHistoryService } from "@/services/listening-history/getHistory.service";
import type { Request, Response } from "express";

export const getHistoryController = async (req: Request, res: Response) => {
  const user = req.user;
  const { platform } = req;

  if (!user) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "User session not found or expired",
    );
  }

  const history = await getHistoryService(user.id, platform);

  res.status(200).json({ history: history });
};
