import express from "express";
import multer from "multer";
import path from "path";
import { prepareUploadPaths } from "@/middleware/upload.middleware";
import { uploadHistoryController } from "@/controllers/listening-history/uploadHistory.controller";
import { getHistoryController } from "@/controllers/listening-history/getHistory.controller";
import { validatePlatform } from "@/middleware/platform.middleware";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { createIdempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { getHistorySchema, searchEntitiesSchema } from "@/schemas";
import { validateZipUpload } from "@/middleware/upload.middleware";
import { searchEntityController } from "@/controllers/listening-history/searchEntity.controller";

const router = express.Router();
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

router.use(generalLimiter);

router.get(
  "/:platform/recent",
  validateRequest(getHistorySchema, "params"),
  checkAuth,
  getHistoryController,
);

router.post(
  "/:platform/upload",
  checkAuth,
  upload.single("history"),
  validatePlatform,
  validateZipUpload,
  createIdempotencyMiddleware(),
  prepareUploadPaths,
  uploadHistoryController,
);

router.get(
  "/search",
  checkAuth,
  validateRequest(searchEntitiesSchema, "query"),
  searchEntityController,
);

export default router;
