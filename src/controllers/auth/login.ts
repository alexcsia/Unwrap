import type { Request, Response } from "express";
import { authenticateUser } from "@/services/auth/authenticateUser";

/**
 * POST /auth/login
 *
 * Endpoint for authenticating the user and issuing access and refresh tokens. Expects an email and password in the request body.
 * On successful authentication, sets httpOnly cookies for the access and refresh tokens and returns a success message.
 * The access token cookie is set with a short expiration time (e.g., 15 minutes) and the refresh token cookie is set with a longer expiration time (e.g., 7 days).
 * Both cookies are configured to be secure in production and have appropriate sameSite settings to enhance security.
 **/

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
