import { Router } from "express";

import {
  createScheduleController,
  getSchedulesController,
  getScheduleByIdController,
  cancelScheduleController,
  retryScheduleController
} from "../controllers/scheduleController.js";

import {
  getPublishAttemptsController
} from "../controllers/publishAttemptController.js";

const router = Router();

router.post("/", createScheduleController);
router.get("/", getSchedulesController);
router.get("/:id", getScheduleByIdController);
router.get("/:id/attempts", getPublishAttemptsController);
router.patch("/:id/cancel", cancelScheduleController);
router.post("/:id/retry", retryScheduleController);

export default router;
