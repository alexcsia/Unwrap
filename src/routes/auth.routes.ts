import express from "express";
import passport from "passport";

const router = express.Router();

router.use(passport.initialize());
router.use(passport.session());

router.get(
  "/auth/spotify",
  passport.authenticate("spotify", {
    scope: ["user-read-email", "user-read-recently-played"],
  }),
);

router.get(
  "/auth/callback",
  passport.authenticate("spotify", {
    failureRedirect: "/",
    successRedirect: "/dashboard",
  }),
);

//refactor
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.redirect("/dashboard");
    }
    res.redirect("/");
  });
});

export default router;
