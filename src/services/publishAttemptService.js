import {
  getPublishAttemptsByScheduleId
} from "../repositories/publishAttemptRepository.js";

export const getPublishAttemptsByScheduleIdService = async (
  scheduleId
) => {
  return getPublishAttemptsByScheduleId(scheduleId);
};
