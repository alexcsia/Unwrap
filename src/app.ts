import express from "express";
import path from "path";
import "@/config/passport";
import authRoutes from "./routes/auth.routes";
import generalRoutes from "@/routes/general.routes";
import historyRoutes from "@/routes/history.routes";
import expressSession from "express-session";
import { errorMiddleware } from "@/middleware/error.middleware";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "Better to be safe than sorry",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(historyRoutes);
app.use(authRoutes);
app.use(generalRoutes);
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
