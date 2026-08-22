import {
  createSchedule,
  getScheduleById,
  getDueSchedules,
  updateScheduleStatus
} from "../repositories/scheduleRepository.js";

export const createScheduleService = async (data) => {
  return createSchedule({
    ...data,
    scheduledFor: new Date(data.scheduledFor)
  });
};

export const getScheduleByIdService = async (id) => {
  return getScheduleById(id);
};

export const getDueSchedulesService = async (now = new Date()) => {
  return getDueSchedules(now);
};

export const updateScheduleStatusService = async (id, status) => {
  return updateScheduleStatus(id, status);
};
