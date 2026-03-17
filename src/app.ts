import express from "express";
import "@/config/passport";
import authRoutes from "./routes/auth.routes";
import generalRoutes from "@/routes/general.routes";
import historyRoutes from "@/routes/history.routes";
import expressSession from "express-session";
import { errorMiddleware } from "@/middleware/error.middleware";
import passport from "passport";

const app = express();
const PORT = process.env.PORT || 3000;

if (
  process.env.NODE_ENV === "development" &&
  process.env.MOCK_SPOTIFY === "true"
) {
  import("@/mocks/server")
    .then(({ server }) => {
      server.listen();
      console.log("Mocking Spotify API");
    })
    .catch((err) => {
      console.error("Failed to start MSW server:", err);
    });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "Better to be safe than sorry",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.use(authRoutes);
app.use(historyRoutes);
app.use(generalRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
