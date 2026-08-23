import { getScheduleByIdService } from "../services/scheduleService.js";

import {
  getPublishAttemptsService,
  getPublishAttemptByIdService,
  getPublishAttemptsByScheduleIdService
} from "../services/publishAttemptService.js";

export const getPublishHistoryController = async (req, res) => {
  try {
    const attempts = await getPublishAttemptsService();

    return res.status(200).json(attempts);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch publish history"
    });
  }
};

export const getPublishHistoryByIdController = async (req, res) => {
  try {
    const attempt = await getPublishAttemptByIdService(req.params.id);

    if (!attempt) {
      return res.status(404).json({
        error: "Publish attempt not found"
      });
    }

    return res.status(200).json(attempt);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch publish attempt"
    });
  }
};

export const getPublishAttemptsController = async (req, res) => {
  try {
    const schedule = await getScheduleByIdService(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        error: "Schedule not found"
      });
    }

    const attempts =
      await getPublishAttemptsByScheduleIdService(req.params.id);

    return res.status(200).json(attempts);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch publish attempts"
    });
  }
};
