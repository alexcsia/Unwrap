import express from "express";
import { createUserController } from "@/controllers/user/create-user";
import { generalLimiter } from "@/middleware/rateLimit.middleware";

const router = express.Router();

router.post("/register", generalLimiter, createUserController);

export default router;
