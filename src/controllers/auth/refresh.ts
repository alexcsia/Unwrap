import type { Request, Response } from "express";
import { ApiError } from "@/errors/ApiError";
import { rotateRefreshToken } from "@/services/auth/rotateRefreshToken";

export const refreshController = async (req: Request, res: Response) => {
  try {
    const reqRefreshToken = req.cookies.refreshToken;
    if (!reqRefreshToken) {
      throw new ApiError(401, "UNAUTHENTICATED", "No refresh token provided");
    }

    const { accessToken, refreshToken } =
      await rotateRefreshToken(reqRefreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "Tokens refreshed successfully" });
  } catch (error) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });

    throw error;
  }
};
