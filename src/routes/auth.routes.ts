import { loginController } from "@/controllers/auth/login.controller";
import { logoutController } from "@/controllers/auth/logout.controller";
import { refreshController } from "@/controllers/auth/refresh.controller";
import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";
import { authLimiter } from "@/middleware/rateLimit.middleware";
import { connectPlatformController } from "@/controllers/auth/connectPlatform.controller";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { loginSchema, OAuthCallbackSchema } from "@/schemas";
import { validatePlatform } from "@/middleware/platform.middleware";
import { platformCallbackController } from "@/controllers/auth/platformCallback.controller";

const router = express.Router();

router.use(authLimiter);
router.get(
  "/connect/:platform",
  checkAuth,
  validatePlatform,
  connectPlatformController,
);

router.get(
  "/callback/:platform",
  checkAuth,
  validateRequest(OAuthCallbackSchema, "body"),
  platformCallbackController,
);

router.get("/refresh", refreshController);

router.post("/login", validateRequest(loginSchema, "body"), loginController);

router.get("/logout", checkAuth, logoutController);

export default router;
