import express from "express";
import { createUserController } from "@/controllers/user/create";
import { generalLimiter } from "@/middleware/rateLimit.middleware";
import { deleteUserController } from "@/controllers/user/delete";
import { checkAuth } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { createUserSchema } from "@/schemas/user.schema";
const router = express.Router();

router.use(generalLimiter);

router.post(
  "/register",
  validateRequest(createUserSchema, "body"),
  createUserController,
);
router.delete("/delete", generalLimiter, checkAuth, deleteUserController);

export default router;
