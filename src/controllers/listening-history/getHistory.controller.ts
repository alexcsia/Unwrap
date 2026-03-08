import { getHistoryService } from "../../services/listening-history/getHistory.service";
import type { Request, Response } from "express";

export const getHistoryController = async (req: Request, res: Response) => {
  const user = req.user;
  const { platform } = req;

  const history = await getHistoryService(user, platform);

  res.status(200).json({ history: history });
};
