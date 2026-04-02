import type { Request, Response } from "express";
import { authenticateUser } from "@/services/auth/authenticateUser";

export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { accessToken, refreshToken } = await authenticateUser(email, password);

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
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.status(200).json({ message: "Successfully logged in" });
};
