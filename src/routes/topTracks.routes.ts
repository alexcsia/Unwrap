import { getTopTracksController } from "@/controllers/top-tracks/topTracks";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateBody } from "@/middleware/validateBody.middleware";
import { topTracksSchema } from "@/schemas";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateBody(topTracksSchema),
  checkAuth,
  getTopTracksController,
);

export default router;
