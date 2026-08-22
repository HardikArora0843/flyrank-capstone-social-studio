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
          post: true,
          platform: true
        }
      }
    }
  });
};

export const getSchedules = async () => {
  return prisma.schedule.findMany({
    orderBy: {
      scheduledFor: "asc"
    },
    include: {
      variant: {
        include: {
          post: true,
          platform: true
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
          post: true,
          platform: true
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
    orderBy: {
      scheduledFor: "asc"
    },
    include: {
      variant: {
        include: {
          post: true,
          platform: true
        }
      }
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
