import { getTopTracksController } from "@/controllers/top-tracks/topTracks";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";

const router = express.Router();

router.get("/", checkAuth, getTopTracksController);

export default router;
