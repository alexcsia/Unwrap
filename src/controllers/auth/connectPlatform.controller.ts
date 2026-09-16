import { getPlatformAdapter } from "@/platforms/registry";
import type { Request, Response } from "express";

export const connectPlatformController = (req: Request, res: Response) => {
  const { platform } = req.params;
  const adapter = getPlatformAdapter(platform!);
  adapter.initiateOAuth(res);
};
