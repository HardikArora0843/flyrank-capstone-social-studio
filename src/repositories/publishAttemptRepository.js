import prisma from "../config/database.js";

export const createPublishAttempt = async ({
  scheduleId,
  variantId,
  platform,
  idempotencyKey,
  status,
  attemptNumber,
  content,
  preview
}) => {
  return prisma.publishAttempt.create({
    data: {
      scheduleId,
      variantId,
      platform,
      idempotencyKey,
      status,
      attemptNumber,
      content,
      preview
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

export const getPublishAttempts = async () => {
  return prisma.publishAttempt.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      schedule: true,
      variant: {
        include: {
          platform: true,
          post: true
        }
      }
    }
  });
};

export const getPublishAttemptById = async (id) => {
  return prisma.publishAttempt.findUnique({
    where: {
      id
    },
    include: {
      schedule: true,
      variant: {
        include: {
          platform: true,
          post: true
        }
      }
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
