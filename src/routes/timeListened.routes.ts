import express from "express";
import { timeListenedController } from "@/controllers/time-listened/time-listened";
import { checkAuth } from "@/middleware/auth.middleware";
import { generalLimiter } from "@/middleware/rateLimit.middleware";

const router = express.Router();

router.get("/", generalLimiter, checkAuth, timeListenedController);

export default router;
