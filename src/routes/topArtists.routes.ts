import { getTopArtistsController } from "@/controllers/top-artists/topArtists";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";

const router = express.Router();

router.get("/", generalLimiter, checkAuth, getTopArtistsController);

export default router;
