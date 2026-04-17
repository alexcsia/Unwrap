import { getTopTracksController } from "@/controllers/top-tracks/topTracks";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";

const router = express.Router();

router.get("/", generalLimiter, checkAuth, getTopTracksController);

export default router;
