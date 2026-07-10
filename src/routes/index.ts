import { Router } from "express";
import authRoutes from "./auth.routes";
import historyRoutes from "./history.routes";
import topTracksRoutes from "./topTracks.routes";
import topArtistsRoutes from "./topArtists.routes";
import exclusionRoutes from "./exclusions.routes";
import timeListenedRoutes from "./timeListened.routes";
import userRoutes from "./user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/api/history", historyRoutes);
router.use("/api/top-tracks", topTracksRoutes);
router.use("/api/top-artists", topArtistsRoutes);
router.use("/api/exclusions", exclusionRoutes);
router.use("/api/time-listened", timeListenedRoutes);
router.use("/", userRoutes);

export default router;
