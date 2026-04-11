import { getTopArtistsController } from "@/controllers/top-artists/topArtists";
import express from "express";
import { checkAuth } from "@/middleware/auth.middleware";

const router = express.Router();

router.get("/", checkAuth, getTopArtistsController);

export default router;
