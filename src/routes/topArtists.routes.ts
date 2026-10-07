import { getTopArtistsController } from "@/controllers/analytics/topArtists.controller";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { topArtistsSchema } from "@/schemas";
import { validateRequest } from "@/middleware/validateRequest.middleware";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateRequest(topArtistsSchema, "body"),
  checkAuth,
  getTopArtistsController,
);

export default router;
