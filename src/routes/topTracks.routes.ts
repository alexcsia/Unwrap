import { getTopTracksController } from "@/controllers/top-tracks/topTracks";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { topTracksSchema } from "@/schemas";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateRequest(topTracksSchema, "body"),
  checkAuth,
  getTopTracksController,
);

export default router;
