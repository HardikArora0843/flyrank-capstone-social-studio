import { beforeEach, describe, expect, it } from "vitest";

import prisma from "../src/config/database.js";
import {
  processSchedule,
  processDueSchedules
} from "../src/scheduler/publishingWorker.js";

describe("Publishing worker", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  const createDueSchedule = async ({
    adapterKey = "x",
    platformName = "X",
    content = "Test scheduled content",
    idempotencyKey = "worker-test-key"
  } = {}) => {
    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Worker Test Post"
      }
    });

    const platform = await prisma.platform.create({
      data: {
        name: platformName,
        adapterKey,
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: platform.id,
        content,
        status: "APPROVED"
      }
    });

    return prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() - 60 * 1000),
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

  it("publishes a due schedule successfully", async () => {
    const schedule = await createDueSchedule();

    const result = await processSchedule(schedule);

    expect(result.status).toBe("PUBLISHED");
    expect(result.scheduleId).toBe(schedule.id);
    expect(result.externalMessageId).toBe(
      `mock-x-${schedule.idempotencyKey}`
    );

    const updatedSchedule = await prisma.schedule.findUnique({
      where: {
        id: schedule.id
      }
    });

    expect(updatedSchedule.status).toBe("PUBLISHED");

    const variant = await prisma.variant.findUnique({
      where: {
        id: schedule.variantId
      }
    });

    expect(variant.status).toBe("PUBLISHED");

    const attempts = await prisma.publishAttempt.findMany({
      where: {
        scheduleId: schedule.id
      }
    });

    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("SUCCESS");
    expect(attempts[0].attemptNumber).toBe(1);
    expect(attempts[0].externalMessageId).toBe(
      `mock-x-${schedule.idempotencyKey}`
    );
  });

  it("processes due schedules", async () => {
    const first = await createDueSchedule({
      platformName: "X",
      adapterKey: "x",
      idempotencyKey: "worker-due-001"
    });

    const second = await createDueSchedule({
      platformName: "LinkedIn",
      adapterKey: "linkedin",
      idempotencyKey: "worker-due-002"
    });

    const results = await processDueSchedules(new Date());

    expect(results).toHaveLength(2);
    expect(results[0].scheduleId).toBe(first.id);
    expect(results[0].status).toBe("PUBLISHED");
    expect(results[1].scheduleId).toBe(second.id);
    expect(results[1].status).toBe("PUBLISHED");
  });

  it("does not process future schedules", async () => {
    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Future Worker Post"
      }
    });

    const platform = await prisma.platform.create({
      data: {
        name: "Future X",
        adapterKey: "future-x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: platform.id,
        content: "Future scheduled content",
        status: "APPROVED"
      }
    });

    await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
        idempotencyKey: "worker-future-001"
      }
    });

    const results = await processDueSchedules(new Date());

    expect(results).toHaveLength(0);
  });

  it("skips an already successful schedule", async () => {
    const schedule = await createDueSchedule({
      idempotencyKey: "worker-idempotent-001"
    });

    await processSchedule(schedule);

    const refreshedSchedule = await prisma.schedule.findUnique({
      where: {
        id: schedule.id
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

    const result = await processSchedule(refreshedSchedule);

    expect(result.status).toBe("SKIPPED");
    expect(result.reason).toBe("Schedule already published");

    const attempts = await prisma.publishAttempt.findMany({
      where: {
        scheduleId: schedule.id
      }
    });

    expect(attempts).toHaveLength(1);
  });

  it("creates a publish attempt with the schedule idempotency key", async () => {
    const schedule = await createDueSchedule({
      idempotencyKey: "worker-attempt-key"
    });

    await processSchedule(schedule);

    const attempt = await prisma.publishAttempt.findFirst({
      where: {
        scheduleId: schedule.id
      }
    });

    expect(attempt).toBeDefined();
    expect(attempt.idempotencyKey).toBe("worker-attempt-key");
    expect(attempt.platform).toBe("x");
  });
});

