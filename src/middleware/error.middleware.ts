import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { ERROR_MESSAGES } from "@/errors/errorMessages";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let code: keyof typeof ERROR_MESSAGES = "DEFAULT";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;

    console.error(`[${code}]`, err.message, err);
  } else {
    statusCode = 500;
    console.error("Unexpected internal error:", err);
  }

  const safeMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;

  res.status(statusCode).json({
    status: "error",
    code,
    message: safeMessage,
  });
};
