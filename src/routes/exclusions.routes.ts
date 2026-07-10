import {
  addExclusionController,
  deleteExclusionController,
  getExclusionsController,
} from "@/controllers/exclusions/exclusions";
import { checkAuth } from "@/middleware/auth.middleware";
import { validateBody } from "@/middleware/validateBody.middleware";
import { createExclusionSchema, deleteExclusionSchema } from "@/schemas";
import express from "express";

const router = express.Router();

router.post(
  "/",
  validateBody(createExclusionSchema),
  checkAuth,
  addExclusionController,
);
router.delete(
  "/",
  validateBody(deleteExclusionSchema),
  checkAuth,
  deleteExclusionController,
);
router.get("/", checkAuth, getExclusionsController);

export default router;
