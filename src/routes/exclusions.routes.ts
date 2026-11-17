import {
  addExclusionController,
  deleteExclusionController,
  getExclusionsController,
} from "@/controllers/exclusions/exclusions.controller";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { exclusionSchema } from "@/schemas";
import express from "express";

const router = express.Router();

router.use(generalLimiter);

router.post(
  "/",
  checkAuth,
  validateRequest(exclusionSchema, "body"),
  addExclusionController,
);
router.delete(
  "/:type/:targetId",
  validateRequest(exclusionSchema, "params"),
  checkAuth,
  deleteExclusionController,
);
router.get("/", checkAuth, getExclusionsController);

export default router;
