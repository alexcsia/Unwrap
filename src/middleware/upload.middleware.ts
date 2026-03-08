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
    throw new ApiError(400, "No file uploaded");
  }

  if (!req.file.mimetype.includes("zip")) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, "Invalid zip file");
  }

  next();
};

export const prepareUploadPaths = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.file?.path) {
    throw new ApiError(400, "File path not found");
  }

  // Attach paths to req for controller to use
  req.filePaths = {
    filePath: req.file.path,
    extractedPath: path.join(__dirname, "../../uploads/extracted"),
  };

  next();
};
