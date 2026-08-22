import prisma from "../config/database.js";

export const createPublishAttempt = async ({
  scheduleId,
  variantId,
  platform,
  idempotencyKey,
  status,
  attemptNumber
}) => {
  return prisma.publishAttempt.create({
    data: {
      scheduleId,
      variantId,
      platform,
      idempotencyKey,
      status,
      attemptNumber
    }
  });
};

export const getPublishAttemptByIdempotencyKey = async (
  idempotencyKey
) => {
  return prisma.publishAttempt.findFirst({
    where: {
      idempotencyKey
    },
    orderBy: {
      attemptNumber: "desc"
    }
  });
};

export const getPublishAttemptsByScheduleId = async (scheduleId) => {
  return prisma.publishAttempt.findMany({
    where: {
      scheduleId
    },
    orderBy: {
      attemptNumber: "asc"
    }
  });
};

export const updatePublishAttempt = async (id, data) => {
  return prisma.publishAttempt.update({
    where: {
      id
    },
    data
  });
};
