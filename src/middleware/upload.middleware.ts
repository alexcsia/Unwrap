import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/errors/ApiError";

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

export const prepareUploadPaths = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.file?.path) {
    throw new ApiError(
      500,
      "DEFAULT",
      "Multer failed to provide a storage path for the uploaded file.",
    );
  }

  // Attach paths to req for controller to use
  req.filePaths = {
    filePath: req.file.path,
    extractedPath: path.join(__dirname, "../../uploads/extracted"),
  };

  next();
};
