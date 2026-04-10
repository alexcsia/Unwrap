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

const router = express.Router();
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

router.get(
  "/history/:platform/recent",
  checkAuth,
  validatePlatform,
  getHistoryController,
);

router.post(
  "/history/:platform/upload",
  checkAuth,
  validatePlatform,
  upload.single("history"),
  validateZipUpload,
  prepareUploadPaths,
  uploadHistoryController,
);

export default router;
