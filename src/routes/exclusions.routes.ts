import {
  addExclusionController,
  deleteExclusionController,
  getExclusionsController,
} from "@/controllers/exclusions/exclusions";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { exclusionParamsSchema } from "@/schemas";
import express from "express";

const router = express.Router();

router.use(generalLimiter);

router.post(
  "/:type/:targetId",
  checkAuth,
  validateRequest(exclusionParamsSchema, "params"),
  addExclusionController,
);
router.delete(
  "/:type/:targetId",
  validateRequest(exclusionParamsSchema, "params"),
  checkAuth,
  deleteExclusionController,
);
router.get("/", checkAuth, getExclusionsController);

export default router;
