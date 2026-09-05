import express from "express";
import multer from "multer";
import path from "path";
import { prepareUploadPaths } from "@/middleware/upload.middleware";
import { uploadHistoryController } from "@/controllers/listening-history/uploadHistory.controller";
import { getHistoryController } from "@/controllers/listening-history/getHistory.controller";
import { validatePlatform } from "@/middleware/platform.middleware";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency.middleware";
import { validateBody } from "@/middleware/validateBody.middleware";
import { getHistorySchema } from "@/schemas";
import { validateZipUpload } from "@/middleware/upload.middleware";

const router = express.Router();
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

router.use(generalLimiter);

router.get(
  "/:platform/recent",
  validateBody(getHistorySchema),
  checkAuth,
  validatePlatform,
  getHistoryController,
);

router.post(
  "/:platform/upload",
  checkAuth,
  upload.single("history"),
  validatePlatform,
  validateZipUpload,
  idempotencyMiddleware,
  prepareUploadPaths,
  uploadHistoryController,
);

export default router;
