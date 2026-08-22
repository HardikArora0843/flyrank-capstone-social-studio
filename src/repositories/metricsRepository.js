import prisma from "../config/database.js";

export const getPublishingMetrics = async () => {
  const [
    totalSchedules,
    pendingSchedules,
    processingSchedules,
    publishedSchedules,
    failedSchedules,
    cancelledSchedules,
    totalAttempts,
    startedAttempts,
    successfulAttempts,
    failedAttempts
  ] = await Promise.all([
    prisma.schedule.count(),
    prisma.schedule.count({
      where: {
        status: "PENDING"
      }
    }),
    prisma.schedule.count({
      where: {
        status: "PROCESSING"
      }
    }),
    prisma.schedule.count({
      where: {
        status: "PUBLISHED"
      }
    }),
    prisma.schedule.count({
      where: {
        status: "FAILED"
      }
    }),
    prisma.schedule.count({
      where: {
        status: "CANCELLED"
      }
    }),
    prisma.publishAttempt.count(),
    prisma.publishAttempt.count({
      where: {
        status: "STARTED"
      }
    }),
    prisma.publishAttempt.count({
      where: {
        status: "SUCCESS"
      }
    }),
    prisma.publishAttempt.count({
      where: {
        status: "FAILED"
      }
    })
  ]);

  return {
    schedules: {
      total: totalSchedules,
      pending: pendingSchedules,
      processing: processingSchedules,
      published: publishedSchedules,
      failed: failedSchedules,
      cancelled: cancelledSchedules
    },
    publishAttempts: {
      total: totalAttempts,
      started: startedAttempts,
      successful: successfulAttempts,
      failed: failedAttempts
    }
  };
};
