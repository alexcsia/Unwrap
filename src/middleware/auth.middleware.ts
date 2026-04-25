import jwt from "jsonwebtoken";
import { ApiError } from "@/errors/ApiError";
import type { Request, Response, NextFunction } from "express";

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "development") {
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
