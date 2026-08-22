import prisma from "../config/database.js";

export const createSchedule = async ({
  variantId,
  scheduledFor,
  idempotencyKey
}) => {
  return prisma.schedule.create({
    data: {
      variantId,
      scheduledFor,
      idempotencyKey
    },
    include: {
      variant: {
        include: {
          platform: true,
          post: true
        }
      }
    }
  });
};

export const getScheduleById = async (id) => {
  return prisma.schedule.findUnique({
    where: {
      id
    },
    include: {
      variant: {
        include: {
          platform: true,
          post: true
        }
      },
      publishAttempts: {
        orderBy: {
          attemptNumber: "asc"
        }
      }
    }
  });
};

export const getDueSchedules = async (now) => {
  return prisma.schedule.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: now
      }
    },
    include: {
      variant: {
        include: {
          platform: true,
          post: true
        }
      }
    },
    orderBy: {
      scheduledFor: "asc"
    }
  });
};

export const updateScheduleStatus = async (id, status) => {
  return prisma.schedule.update({
    where: {
      id
    },
    data: {
      status
    }
  });
};
