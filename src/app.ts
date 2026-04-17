import express from "express";
import "express-async-errors";
import authRoutes from "./routes/auth.routes";
import historyRoutes from "@/routes/history.routes";
import topTracksRoutes from "@/routes/topTracks.routes";
import topArtistsRoutes from "@/routes/topArtists.routes";
import exclusionRoutes from "@/routes/exclusions.routes";
import { errorMiddleware } from "@/middleware/error.middleware";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Cookie"],
  }),
);

if (
  process.env.NODE_ENV === "development" &&
  process.env.MOCK_SPOTIFY === "true"
) {
  import("@/mocks/server")
    .then(({ server }) => {
      server.listen();
      console.log("Mocking Spotify API");
    })
    .catch((err) => {
      console.error("Failed to start MSW server:", err);
    });
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/top-tracks", topTracksRoutes);
app.use("/api/top-artists", topArtistsRoutes);
app.use("/api/exclusions", exclusionRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
