import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { logoutUser } from "@/services/auth/logoutUser";

/**
 * POST /auth/logout
 *
 * Endpoint for logging out the user. Requires a valid access token.
 * Clears accessToken and refreshToken cookies.
 * Invalidates the refresh token on the server.
 * Returns an unauthorized error if no user is authenticated.
 */

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
