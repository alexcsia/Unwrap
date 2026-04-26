import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

/**
 * Middleware: validateZipUpload
 *
 * Validates uploaded file for history ingestion.
 *
 * Requirements:
 * - File must exist
 * - File must be a ZIP archive
 *
 * Behavior:
 * - Deletes invalid files
 * - Throws error if validation fails
 */

export const validateZipUpload = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    throw new ApiError(
      400,
      "NO_FILES_FOUND",
      "No file found in the request body.",
    );
  }

  if (!req.file.mimetype.includes("zip")) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(
      400,
      "INVALID_UPLOAD",
      `Expected .zip, received ${req.file.mimetype}`,
    );
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
