import express from "express";
import { timeListenedController } from "@/controllers/time-listened/time-listened";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { timeListenedSchema } from "@/schemas";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateRequest(timeListenedSchema, "body"),
  checkAuth,
  timeListenedController,
);

export default router;
