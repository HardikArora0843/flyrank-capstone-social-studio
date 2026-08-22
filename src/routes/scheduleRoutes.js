import { Router } from "express";

import {
  createScheduleController,
  getSchedulesController,
  getScheduleByIdController,
  cancelScheduleController
} from "../controllers/scheduleController.js";

const router = Router();

router.post("/", createScheduleController);
router.get("/", getSchedulesController);
router.get("/:id", getScheduleByIdController);
router.patch("/:id/cancel", cancelScheduleController);

export default router;
