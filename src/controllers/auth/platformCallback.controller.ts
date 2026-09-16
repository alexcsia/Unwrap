import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { getPlatformAdapter } from "@/platforms/registry";
import querystring from "querystring";

export const platformCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { platform } = req.params;
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!state) {
      return res.redirect(
        "/#" + querystring.stringify({ error: "state_mismatch" }),
      );
    }

    if (!code) {
      throw new ApiError(400, "BAD_REQUEST", "Missing authorization code");
    }

    const adapter = getPlatformAdapter(platform!);
    await adapter.exchangeCode(req.user!.id, code);

    res.json({
      success: true,
      message: `${platform} account connected successfully.`,
      platform,
    });
  } catch (error) {
    next(error);
  }
};
