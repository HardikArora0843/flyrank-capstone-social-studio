import { Router } from "express";

import {
  createScheduleController,
  getSchedulesController,
  getScheduleByIdController,
  cancelScheduleController,
  retryScheduleController
} from "../controllers/scheduleController.js";

const router = Router();

router.post("/", createScheduleController);
router.get("/", getSchedulesController);
router.get("/:id", getScheduleByIdController);
router.patch("/:id/cancel", cancelScheduleController);
router.post("/:id/retry", retryScheduleController);

export default router;
