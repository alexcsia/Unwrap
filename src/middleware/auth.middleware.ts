import jwt from "jsonwebtoken";
import { ApiError } from "@/errors/ApiError";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware: checkAuth
 *
 * Authenticates requests using JWT access token.
 * Reads accessToken from cookies and verifies it.
 * Attaches user id to req.user on success.
 *
 * Development mode:
 * - Skips verification and sets a mock user id.
 *
 * Errors:
 * - 401 if access token is missing
 * - 401 if token is invalid or expired
 */

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "development") {
    console.log("DEV");
    req.user = { id: "1234" };
    return next();
  }

  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    return next(new ApiError(401, "UNAUTHORIZED", "Missing access token"));
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as {
      sub: string;
    };
    req.user = { id: decoded.sub };
    next();
  } catch (error) {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
};
