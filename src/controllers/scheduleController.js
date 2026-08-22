import {
  createScheduleService,
  getScheduleByIdService
} from "../services/scheduleService.js";

import { validateCreateSchedule } from "../validators/scheduleValidator.js";

export const createScheduleController = async (req, res) => {
  const validationError = validateCreateSchedule(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const schedule = await createScheduleService(req.body);

    return res.status(201).json(schedule);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "idempotencyKey already exists"
      });
    }

    return res.status(500).json({
      error: "Failed to create schedule"
    });
  }
};

export const getScheduleByIdController = async (req, res) => {
  try {
    const schedule = await getScheduleByIdService(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        error: "Schedule not found"
      });
    }

    return res.status(200).json(schedule);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch schedule"
    });
  }
};
