import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { ERROR_MESSAGES } from "@/errors/errorMessages";

/**
 * Middleware: errorMiddleware
 *
 * Global error handler.
 * Formats all API errors into a consistent response structure.
 *
 * Behavior:
 * - Handles ApiError instances with custom status code and error code
 * - Logs known and unknown errors
 * - Maps error codes to safe public messages
 *
 * Response:
 * {
 *   status: "error",
 *   code: string,
 *   message: string
 * }
 */

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
