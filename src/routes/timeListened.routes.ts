import express from "express";
import { timeListenedController } from "@/controllers/time-listened/time-listened";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { validateBody } from "@/middleware/validateBody.middleware";
import { timeListenedSchema } from "@/schemas";

const router = express.Router();

router.use(generalLimiter);

router.get(
  "/",
  validateBody(timeListenedSchema),
  checkAuth,
  timeListenedController,
);

export default router;
