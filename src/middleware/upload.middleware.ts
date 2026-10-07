import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";
import { uploadHistorySchema } from "@/schemas";

export const validateZipUpload = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const data = {
    file: req.file,
  };

  const result = uploadHistorySchema.safeParse(data);
  if (!result.success) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new ApiError(400, "INVALID_UPLOAD", "File uploaded is invalid");
  }

  next();
};

/**
 * Middleware: prepareUploadPaths
 *
 * Prepares filesystem paths for uploaded history files.
 * Used before ingestion processing.
 *
 * Behavior:
 * - Creates extracted folder path
 * - Attaches filePath and extractedPath to req.filePaths
 * - Throws error if upload path is missing
 */

export const prepareUploadPaths = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.file?.path) {
    throw new ApiError(
      500,
      "DEFAULT",
      "Multer failed to provide a storage path.",
    );
  }

  const uniqueFolder = `${req.file.filename}_extracted`;

  req.filePaths = {
    filePath: req.file.path,
    extractedPath: path.join(path.dirname(req.file.path), uniqueFolder),
  };

  next();
};
