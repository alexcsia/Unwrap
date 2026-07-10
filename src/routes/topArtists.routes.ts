import { getTopArtistsController } from "@/controllers/top-artists/topArtists";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { topArtistsSchema } from "@/schemas";
import { validateBody } from "@/middleware/validateBody.middleware";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateBody(topArtistsSchema),
  checkAuth,
  getTopArtistsController,
);

export default router;
