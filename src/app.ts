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

  app.use(cookieParser());
  app.use(helmet());

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-Requested-With"],
    }),
  );

  app.use(express.json({ limit: "40kb" }));
  app.use(express.urlencoded({ limit: "40kb", extended: true }));

  app.use(routes);

  app.use(errorMiddleware);

  return app;
}
