import {
  createSchedule,
  getSchedules,
  getScheduleById,
  getDueSchedules,
  updateScheduleStatus
} from "../repositories/scheduleRepository.js";

export const createScheduleService = async (data) => {
  return createSchedule(data);
};

export const getSchedulesService = async (status) => {
  return getSchedules(status);
};

export const getScheduleByIdService = async (id) => {
  return getScheduleById(id);
};

export const getDueSchedulesService = async (now) => {
  return getDueSchedules(now);
};

export const updateScheduleStatusService = async (id, status) => {
  return updateScheduleStatus(id, status);
};

export const retryScheduleService = async (id) => {
  return updateScheduleStatus(id, "PENDING");
};
