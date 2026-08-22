import express from "express";

import {
  createScheduleController,
  getScheduleByIdController
} from "../controllers/scheduleController.js";

const router = express.Router();

router.post("/", createScheduleController);
router.get("/:id", getScheduleByIdController);

export default router;
