import express from "express";
import passport from "passport";
import multer from "multer";
import {
  validateZipUpload,
  prepareUploadPaths,
} from "../middleware/upload.middleware";
import { uploadHistoryController } from "../controllers/listening-history/uploadHistory.controller";
import { getHistoryController } from "../controllers/listening-history/getHistory.controller";
import { validatePlatform } from "../middleware/platform.middleware";

const router = express.Router();
const upload = multer({ dest: "/uploads" });

router.get(
  "/history/:platform/recent",
  passport.session(),
  validatePlatform,
  getHistoryController,
);

router.post(
  "/history/:platform/upload",
  passport.session(),
  validatePlatform,
  upload.single("history"),
  validateZipUpload,
  prepareUploadPaths,
  uploadHistoryController,
);

export default router;
