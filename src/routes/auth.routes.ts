import { loginController } from "@/controllers/auth/login";
import { logoutController } from "@/controllers/auth/logout";
import { refreshController } from "@/controllers/auth/refresh";
import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";
import { authLimiter } from "@/middleware/rateLimit.middleware";
import { connectPlatformController } from "@/controllers/auth/connectPlatform";
import { validateRequest } from "@/middleware/validateRequest.middleware";
import { loginSchema, OAuthCallbackSchema } from "@/schemas";
import { validatePlatform } from "@/middleware/platform.middleware";
import { platformCallbackController } from "@/controllers/auth/spotifyCallback";

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
