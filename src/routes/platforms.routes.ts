import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validatePlatform } from "@/middleware/platform.middleware";
import { deletePlatformController } from "@/controllers/platforms/deletePlatform.controller";
import { listPlatformsController } from "@/controllers/platforms/listPlatforms.controller";
const router = express.Router();

router.use(generalLimiter);

router.get("/", checkAuth, listPlatformsController);

router.delete(
  "/:platform",
  checkAuth,
  validatePlatform,
  deletePlatformController,
);

export default router;
