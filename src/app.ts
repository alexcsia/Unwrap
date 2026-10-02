import express from "express";
import "express-async-errors";
import { errorMiddleware } from "@/middleware/error.middleware";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import routes from "./routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // const PORT = process.env.PORT || 3000;

  app.use(cookieParser());
  app.use(helmet());

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Cookie"],
    }),
  );

  app.use(express.json({ limit: "40kb" }));
  app.use(express.urlencoded({ limit: "40kb", extended: true }));

  app.use(routes);

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(errorMiddleware);

  return app;
}
