import {
  getDueSchedulesService,
  updateScheduleStatusService
} from "../services/scheduleService.js";

import {
  createPublishAttempt,
  getPublishAttemptByIdempotencyKey,
  updatePublishAttempt
} from "../repositories/publishAttemptRepository.js";

import prisma from "../config/database.js";
import { publishContentService } from "../services/publisherService.js";

export const processSchedule = async (schedule) => {
  const existingAttempt = await getPublishAttemptByIdempotencyKey(
    schedule.idempotencyKey
  );

  if (existingAttempt?.status === "SUCCESS") {
    await updateScheduleStatusService(schedule.id, "PUBLISHED");

    return {
      status: "SKIPPED",
      reason: "Schedule already published",
      scheduleId: schedule.id
    };
  }

  await updateScheduleStatusService(schedule.id, "PROCESSING");

  const attemptNumber = existingAttempt
    ? existingAttempt.attemptNumber + 1
    : 1;

  const attempt = await createPublishAttempt({
    scheduleId: schedule.id,
    variantId: schedule.variantId,
    platform: schedule.variant.platform.adapterKey,
    idempotencyKey: schedule.idempotencyKey,
    status: "STARTED",
    attemptNumber
  });

  try {
    const result = await publishContentService({
      platform: schedule.variant.platform,
      content: schedule.variant.content,
      idempotencyKey: schedule.idempotencyKey
    });

    await updatePublishAttempt(attempt.id, {
      status: "SUCCESS",
      externalMessageId: result.externalMessageId,
      publishedAt: result.publishedAt
    });

    await prisma.variant.update({
      where: {
        id: schedule.variantId
      },
      data: {
        status: "PUBLISHED"
      }
    });

    await updateScheduleStatusService(schedule.id, "PUBLISHED");

    return {
      status: "PUBLISHED",
      scheduleId: schedule.id,
      externalMessageId: result.externalMessageId
    };
  } catch (error) {
    await updatePublishAttempt(attempt.id, {
      status: "FAILED",
      error: error.message
    });

    await updateScheduleStatusService(schedule.id, "FAILED");

    return {
      status: "FAILED",
      scheduleId: schedule.id,
      error: error.message
    };
  }
};

export const processDueSchedules = async (now = new Date()) => {
  const schedules = await getDueSchedulesService(now);
  const results = [];

  for (const schedule of schedules) {
    const result = await processSchedule(schedule);
    results.push(result);
  }

  return results;
};
