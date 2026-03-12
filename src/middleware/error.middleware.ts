import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_UPLOAD: "Uploaded file or folder is not valid",
  NO_FILES_FOUND: "Please select a file to upload",
  DB_ERROR: "Failed to save listening history",
  UNAUTHORIZED: "You are not authorized",
  DEFAULT: "Internal server error",
  MISSING_PLATFORM: "Platform parameter is missing",
  UNSUPPORTED_PLATFORM: "Unsupported platform",
  SPOTIFY_API_ERROR: "Error while fetching Spotify API",
};

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let code = "DEFAULT";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;

    console.error(`[${code}]`, err.message, err);
  } else {
    console.error("Unexpected internal error:", err);
  }

  const safeMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;

  res.status(statusCode).json({
    status: "error",
    code,
    message: safeMessage,
  });
};
