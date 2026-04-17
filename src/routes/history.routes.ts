import express from "express";
import multer from "multer";
import path from "path";
import {
  validateZipUpload,
  prepareUploadPaths,
} from "@/middleware/upload.middleware";
import { uploadHistoryController } from "@/controllers/listening-history/uploadHistory.controller";
import { getHistoryController } from "@/controllers/listening-history/getHistory.controller";
import { validatePlatform } from "@/middleware/platform.middleware";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";

const router = express.Router();
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

router.get(
  "/:platform/recent",
  generalLimiter,
  checkAuth,
  validatePlatform,
  getHistoryController,
);

router.post(
  "/:platform/upload",
  generalLimiter,
  checkAuth,
  validatePlatform,
  upload.single("history"),
  validateZipUpload,
  prepareUploadPaths,
  uploadHistoryController,
);

export default router;
