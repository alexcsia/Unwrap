import { getTopArtists } from "@/controllers/top-artists/topArtists";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";

const router = express.Router();

router.get("/api/top-artists", checkAuth, getTopArtists);

export default router;
