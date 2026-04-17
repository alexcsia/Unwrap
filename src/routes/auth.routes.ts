import { loginController } from "@/controllers/auth/login";
import { logoutController } from "@/controllers/auth/logout";
import { refreshController } from "@/controllers/auth/refresh";
import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";
import querystring from "querystring";
import { authLimiter } from "@/middleware/rateLimit.middleware";
import { randomBytes } from "crypto";
import { spotifyCallbackController } from "@/controllers/auth/spotifyCallback";

const router = express.Router();

const generateRandomString = (length: number): string =>
  randomBytes(length).toString("hex").slice(0, length);

router.get("/spotify", authLimiter, checkAuth, function (req, res) {
  var state = generateRandomString(16);
  const scope = "user-read-email user-read-recently-played";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        scope: scope,
        redirect_uri: process.env.SPOTIFY_CALLBACK_URI!,
        state: state,
      }),
  );
});
router.get("/callback", authLimiter, checkAuth, spotifyCallbackController);

router.get("/refresh", authLimiter, checkAuth, refreshController);

router.post("/login", authLimiter, loginController);

router.get("/logout", authLimiter, checkAuth, logoutController);

export default router;
