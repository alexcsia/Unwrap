import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { logoutUser } from "@/services/auth/logoutUser";

export const logoutController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "UNAUTHORIZED", "No active session");
  }
  await logoutUser(req.user.id);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};
