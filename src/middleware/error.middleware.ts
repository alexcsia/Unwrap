import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    error: "Internal server error",
  });
};
