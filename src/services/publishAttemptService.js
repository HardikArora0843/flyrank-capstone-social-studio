import {
  getPublishAttempts,
  getPublishAttemptById,
  getPublishAttemptsByScheduleId
} from "../repositories/publishAttemptRepository.js";

export const getPublishAttemptsService = async () => {
  return getPublishAttempts();
};

export const getPublishAttemptByIdService = async (id) => {
  return getPublishAttemptById(id);
};

export const getPublishAttemptsByScheduleIdService = async (
  scheduleId
) => {
  return getPublishAttemptsByScheduleId(scheduleId);
};
