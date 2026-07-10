import express from "express";
import { createUserController } from "@/controllers/user/create";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { deleteUserController } from "@/controllers/user/delete";
import { checkAuth } from "@/middleware/auth.middleware";
import { validateBody } from "@/middleware/validateBody.middleware";
import { createUserSchema } from "@/schemas/user.schema";
const router = express.Router();

router.post(
  "/register",
  generalLimiter,
  validateBody(createUserSchema),
  createUserController,
);
router.delete("/delete", generalLimiter, checkAuth, deleteUserController);

export default router;
