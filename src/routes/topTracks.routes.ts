import { getTopTracksController } from "@/controllers/analytics/topTracks.controller";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { dateRangeSchema } from "@/schemas/dateRange.schema";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateRequest(dateRangeSchema, "body"),
  checkAuth,
  getTopTracksController,
);

export default router;
