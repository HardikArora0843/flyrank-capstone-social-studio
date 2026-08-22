import {
  createScheduleService,
  getSchedulesService,
  getScheduleByIdService,
  updateScheduleStatusService
} from "../services/scheduleService.js";

import { validateCreateSchedule } from "../validators/scheduleValidator.js";

const validStatuses = [
  "PENDING",
  "PROCESSING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED"
];

export const createScheduleController = async (req, res) => {
  const validationError = validateCreateSchedule(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const existing = await getSchedulesService();

    const duplicate = existing.find(
      (schedule) =>
        schedule.idempotencyKey === req.body.idempotencyKey
    );

    if (duplicate) {
      return res.status(409).json({
        error: "idempotencyKey already exists"
      });
    }

    const schedule = await createScheduleService({
      variantId: req.body.variantId,
      scheduledFor: new Date(req.body.scheduledFor),
      idempotencyKey: req.body.idempotencyKey
    });

    return res.status(201).json(schedule);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create schedule",
      details: error.message
    });
  }
};

export const getSchedulesController = async (req, res) => {
  const { status } = req.query;

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      error:
        "status must be one of PENDING, PROCESSING, PUBLISHED, FAILED, CANCELLED"
    });
  }

  try {
    const schedules = await getSchedulesService(status);

    return res.status(200).json(schedules);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch schedules"
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

export const cancelScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleByIdService(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        error: "Schedule not found"
      });
    }

    if (schedule.status !== "PENDING") {
      return res.status(409).json({
        error: `Cannot cancel schedule with status ${schedule.status}`
      });
    }

    const cancelledSchedule = await updateScheduleStatusService(
      schedule.id,
      "CANCELLED"
    );

    return res.status(200).json(cancelledSchedule);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to cancel schedule"
    });
  }
};
