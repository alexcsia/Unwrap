import { getTopTracks } from "@/controllers/top-tracks/topTracks";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";

const router = express.Router();

router.get("/api/top-tracks", checkAuth, getTopTracks);

export default router;
