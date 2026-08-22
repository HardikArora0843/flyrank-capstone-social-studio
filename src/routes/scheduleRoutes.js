import { Router } from "express";

import {
  createScheduleController,
  getSchedulesController,
  getScheduleByIdController
} from "../controllers/scheduleController.js";

const router = Router();

router.post("/", createScheduleController);
router.get("/", getSchedulesController);
router.get("/:id", getScheduleByIdController);

export default router;
