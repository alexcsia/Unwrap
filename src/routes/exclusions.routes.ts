import {
  addExclusionController,
  deleteExclusionController,
  getExclusionsController,
} from "@/controllers/exclusions/exclusions";
import { checkAuth } from "@/middleware/auth.middleware";
import express from "express";

const router = express.Router();

router.post("/", checkAuth, addExclusionController);
router.delete("/", checkAuth, deleteExclusionController);
router.get("/", checkAuth, getExclusionsController);

export default router;
