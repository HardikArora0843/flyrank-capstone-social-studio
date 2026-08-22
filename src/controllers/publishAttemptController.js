import { getScheduleByIdService } from "../services/scheduleService.js";

import {
  getPublishAttemptsByScheduleIdService
} from "../services/publishAttemptService.js";

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
