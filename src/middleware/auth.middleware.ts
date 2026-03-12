import { ApiError } from "@/errors/ApiError";
import type { Request, Response, NextFunction } from "express";

export const checkAuth = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (req.isAuthenticated()) {
    return _next();
  } else {
    throw new ApiError(401, "UNAUTHORIZED", "Failed auth check");
  }
};
