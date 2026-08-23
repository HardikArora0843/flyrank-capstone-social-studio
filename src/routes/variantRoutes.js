import express from "express";

import {
  createVariantController,
  getVariantsByPostIdController,
  getVariantByIdController,
  updateVariantController,
  approveVariantController,
  rejectVariantController
} from "../controllers/variantController.js";

import { createScheduleController } from "../controllers/scheduleController.js";

const router = express.Router();

router.post("/", createVariantController);
router.patch("/:id", updateVariantController);
router.post("/:id/approve", approveVariantController);
router.post("/:id/reject", rejectVariantController);
router.post("/:id/schedule", (req, res, next) => {
  req.body = { ...req.body, variantId: req.params.id };
  return createScheduleController(req, res, next);
});
router.get("/post/:postId", getVariantsByPostIdController);
router.get("/:id", getVariantByIdController);

export default router;
