import { loginController } from "@/controllers/auth/login";
import { logoutController } from "@/controllers/auth/logout";
import { refreshController } from "@/controllers/auth/refresh";
import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";
import passport from "passport";
import { ApiError } from "@/errors/ApiError";

const router = express.Router();

router.get(
  "/spotify",
  checkAuth,
  passport.authenticate("spotify", {
    session: false,
    scope: ["user-read-email", "user-read-recently-played"],
  }),
);

router.get("/callback", checkAuth, (req, res, next) => {
  passport.authenticate(
    "spotify",
    { session: false },
    (err: Error | null, user: any) => {
      if (err) return next(err);

      if (!user) {
        return next(
          new ApiError(401, "UNAUTHORIZED", "Spotify authentication failed"),
        );
      }

      const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${FRONTEND_URL}/settings/integrations?success=true`);
    },
  )(req, res, next);
});

router.get("/refresh", checkAuth, refreshController);

router.post("/login", loginController);

router.get("/logout", checkAuth, logoutController);

export default router;
