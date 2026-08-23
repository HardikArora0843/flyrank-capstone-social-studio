import {
  createScheduleService,
  getSchedulesService,
  getScheduleByIdService,
  updateScheduleStatusService,
  retryScheduleService
} from "../services/scheduleService.js";

import {
  getVariantByIdService
} from "../services/variantService.js";

import {
  validateCreateSchedule
} from "../validators/scheduleValidator.js";

import {
  getPublishAttemptsByScheduleId
} from "../repositories/publishAttemptRepository.js";

const validStatuses = [
  "PENDING",
  "PROCESSING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED"
];

const MAX_PUBLISH_ATTEMPTS = Number(
  process.env.MAX_PUBLISH_ATTEMPTS || 3
);

const buildScheduleIdempotencyKey = ({ variantId, scheduledFor }) => {
  return `variant:${variantId}:slot:${scheduledFor.toISOString()}`;
};

export const createScheduleController = async (req, res) => {
  const validationError = validateCreateSchedule(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const variant = await getVariantByIdService(req.body.variantId);

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found"
      });
    }

    if (variant.status !== "APPROVED") {
      return res.status(409).json({
        error: `Only APPROVED variants can be scheduled. Current status: ${variant.status}`
      });
    }

    const scheduledFor = new Date(req.body.scheduledFor);
    const idempotencyKey =
      req.body.idempotencyKey ||
      buildScheduleIdempotencyKey({
        variantId: req.body.variantId,
        scheduledFor
      });

    const schedule = await createScheduleService({
      variantId: req.body.variantId,
      scheduledFor,
      idempotencyKey
    });

    return res.status(201).json(schedule);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "A schedule already exists for this idempotency key or variant slot"
      });
    }

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

export const retryScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleByIdService(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        error: "Schedule not found"
      });
    }

    if (schedule.status !== "FAILED") {
      return res.status(409).json({
        error: `Cannot retry schedule with status ${schedule.status}`
      });
    }

    const attempts = await getPublishAttemptsByScheduleId(schedule.id);
    const latestAttempt = attempts[attempts.length - 1];

    if (
      latestAttempt &&
      latestAttempt.attemptNumber >= MAX_PUBLISH_ATTEMPTS
    ) {
      return res.status(409).json({
        error: "Maximum publish attempts reached",
        attemptNumber: latestAttempt.attemptNumber
      });
    }

    const retriedSchedule = await retryScheduleService(schedule.id);

    return res.status(200).json(retriedSchedule);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to retry schedule"
    });
  }
};
