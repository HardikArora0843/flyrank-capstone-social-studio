import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/server.js";
import prisma from "../src/config/database.js";
import { processDueSchedules } from "../src/scheduler/publishingWorker.js";
import { createPublisherAdapter } from "../src/adapters/index.js";
import { publishContentService } from "../src/services/publisherService.js";

describe("Official Capstone Acceptance Probes (1 to 6)", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  const setupDefaultPlatforms = async () => {
    const telegram = await prisma.platform.create({
      data: {
        name: "Telegram",
        adapterKey: "telegram",
        maxLength: 4096,
        tone: "informative",
        maxHashtags: 10
      }
    });

    const x = await prisma.platform.create({
      data: {
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      }
    });

    const linkedIn = await prisma.platform.create({
      data: {
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      }
    });

    return { telegram, x, linkedIn };
  };

  /**
   * PROBE 1:
   * Ingest a sample post. The system generates variants for each configured platform,
   * and each variant passes its constraint profile.
   */
  it("PROBE 1 — Ingest a sample post and verify generated variants satisfy constraint profiles", async () => {
    await setupDefaultPlatforms();

    const sampleBlogMarkdown = `
# How AI Is Transforming Modern Software Engineering

Artificial intelligence is reshaping the software industry. Teams automate repetitive tasks and accelerate releases.
Modern AI coding assistants assist developers across refactoring, debugging, and testing.
#ai #software #engineering #development #future
    `.trim();

    const postResponse = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: sampleBlogMarkdown
      });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body.id).toBeDefined();

    // Verify variants were generated for all 3 platforms
    const variantsResponse = await request(app).get(
      `/api/posts/${postResponse.body.id}/variants`
    );

    expect(variantsResponse.status).toBe(200);
    expect(variantsResponse.body).toHaveLength(3);

    for (const variant of variantsResponse.body) {
      expect(variant.postId).toBe(postResponse.body.id);
      expect(variant.status).toBe("DRAFT");
      expect(variant.content).toBeTruthy();

      const platform = variant.platform;
      // 1. Length constraint
      expect(variant.content.length).toBeLessThanOrEqual(platform.maxLength);

      // 2. Hashtag constraint
      const hashtagCount = (variant.content.match(/(^|\s)#[A-Za-z0-9_]+/g) || []).length;
      expect(hashtagCount).toBeLessThanOrEqual(platform.maxHashtags);

      // 3. Tone constraint check
      if (platform.tone === "concise") {
        const sentenceCount = variant.content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        expect(sentenceCount).toBeLessThanOrEqual(3);
      } else if (platform.tone === "professional") {
        expect(/\b(lol|omg|btw)\b/i.test(variant.content)).toBe(false);
      }
    }
  });

  /**
   * PROBE 2:
   * Create a variant that breaks a platform rule. The validation blocks it with a clear error, before review.
   */
  it("PROBE 2 — Create or edit a variant breaking platform rules; validation blocks it before review", async () => {
    const { x, linkedIn } = await setupDefaultPlatforms();

    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Test Post"
      }
    });

    // 1. Violation of maxLength and hashtag limit on X platform
    const tooManyHashtagsAndTooLong = "a".repeat(290) + " #one #two #three #four #five";
    const createViolationResponse = await request(app)
      .post("/api/variants")
      .send({
        postId: post.id,
        platformId: x.id,
        content: tooManyHashtagsAndTooLong
      });

    expect(createViolationResponse.status).toBe(400);
    expect(createViolationResponse.body.error).toBe("Variant violates platform constraints");
    expect(createViolationResponse.body.details.length).toBeGreaterThanOrEqual(1);

    // 2. Violation of professional tone on LinkedIn
    const unprofessionalContent = "lol omg btw check this out!!";
    const toneViolationResponse = await request(app)
      .post("/api/variants")
      .send({
        postId: post.id,
        platformId: linkedIn.id,
        content: unprofessionalContent
      });

    expect(toneViolationResponse.status).toBe(400);
    expect(toneViolationResponse.body.error).toBe("Variant violates platform constraints");
    expect(
      toneViolationResponse.body.details.some(d => d.includes("professional tone"))
    ).toBe(true);

    // 3. Verify that editing an existing variant to an invalid state is also blocked
    const validVariant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: x.id,
        content: "Valid initial content #tech",
        status: "DRAFT"
      }
    });

    const patchViolationResponse = await request(app)
      .patch(`/api/variants/${validVariant.id}`)
      .send({
        content: "a".repeat(300)
      });

    expect(patchViolationResponse.status).toBe(400);
    expect(patchViolationResponse.body.error).toBe("Variant violates platform constraints");
  });

  /**
   * PROBE 3:
   * Try to schedule an unapproved variant. The system refuses with an honest 4xx.
   */
  it("PROBE 3 — Attempt to schedule an unapproved variant (DRAFT / REJECTED) returns 4xx", async () => {
    const { telegram } = await setupDefaultPlatforms();

    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Unapproved Variant Post"
      }
    });

    const draftVariant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: telegram.id,
        content: "Draft announcement text",
        status: "DRAFT"
      }
    });

    // Try to schedule DRAFT variant
    const draftScheduleResponse = await request(app)
      .post("/api/schedules")
      .send({
        variantId: draftVariant.id,
        scheduledFor: new Date(Date.now() + 60 * 1000).toISOString()
      });

    expect(draftScheduleResponse.status).toBe(409);
    expect(draftScheduleResponse.body.error).toContain("Only APPROVED variants can be scheduled");

    // Reject the variant and try to schedule REJECTED variant
    const rejectedVariant = await prisma.variant.update({
      where: { id: draftVariant.id },
      data: { status: "REJECTED" }
    });

    const rejectedScheduleResponse = await request(app)
      .post(`/api/variants/${rejectedVariant.id}/schedule`)
      .send({
        scheduledFor: new Date(Date.now() + 60 * 1000).toISOString()
      });

    expect(rejectedScheduleResponse.status).toBe(409);
    expect(rejectedScheduleResponse.body.error).toContain("Only APPROVED variants can be scheduled");
  });

  /**
   * PROBE 4:
   * Approve a variant and schedule it two minutes out.
   * The scheduler publishes it to the real free target. The publish record links to the live message.
   */
  it("PROBE 4 — Approve a variant, schedule it, scheduler publishes to target and records link", async () => {
    const { telegram } = await setupDefaultPlatforms();

    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Capstone Launch Announcement"
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: telegram.id,
        content: "Capstone launch announcement on Telegram!",
        status: "DRAFT"
      }
    });

    // 1. Approve the variant
    const approveResponse = await request(app)
      .post(`/api/variants/${variant.id}/approve`);
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe("APPROVED");

    // 2. Schedule two minutes out
    const scheduledTime = new Date(Date.now() + 2 * 60 * 1000);
    const scheduleResponse = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor: scheduledTime.toISOString()
      });

    expect(scheduleResponse.status).toBe(201);
    expect(scheduleResponse.body.status).toBe("PENDING");
    const scheduleId = scheduleResponse.body.id;

    // 3. Run scheduler cycle when due (simulating time passing 2 minutes)
    const futureSimulatedTime = new Date(scheduledTime.getTime() + 1000);
    const publishResults = await processDueSchedules(futureSimulatedTime);

    expect(publishResults).toHaveLength(1);
    expect(publishResults[0].status).toBe("PUBLISHED");

    // 4. Verify publish attempt history record
    const historyResponse = await request(app).get("/api/publish-history");
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.length).toBeGreaterThanOrEqual(1);

    const publishRecord = historyResponse.body.find(a => a.scheduleId === scheduleId);
    expect(publishRecord).toBeDefined();
    expect(publishRecord.status).toBe("SUCCESS");
    expect(publishRecord.platform).toBe("telegram");
    expect(publishRecord.externalMessageId).toBeTruthy();
    expect(publishRecord.preview).toBeTruthy();
  });

  /**
   * PROBE 5:
   * Force a publish retry: stop the worker mid-publish, then restart.
   * The history shows exactly one successful post. No duplicates.
   */
  it("PROBE 5 — Worker interrupted mid-publish resumes safely with exactly one successful post", async () => {
    const { x } = await setupDefaultPlatforms();

    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Crash Recovery Post"
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: x.id,
        content: "Resilience test content",
        status: "APPROVED"
      }
    });

    const idempotencyKey = "probe-5-crash-recovery-key";
    const schedule = await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() - 60 * 1000), // Due in the past
        status: "PROCESSING", // Simulating worker crash while processing
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

    // Simulate an interrupted STARTED attempt before worker died
    await prisma.publishAttempt.create({
      data: {
        scheduleId: schedule.id,
        variantId: variant.id,
        platform: "x",
        idempotencyKey,
        status: "STARTED",
        attemptNumber: 1,
        content: variant.content
      }
    });

    // Restart worker: worker processes due schedules
    const recoveryResults = await processDueSchedules(new Date());

    expect(recoveryResults).toHaveLength(1);
    expect(recoveryResults[0].status).toBe("PUBLISHED");

    // Check all attempts recorded for this schedule
    const allAttempts = await prisma.publishAttempt.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { attemptNumber: "asc" }
    });

    // Exactly 1 STARTED (interrupted) + 1 SUCCESS (resumed)
    expect(allAttempts).toHaveLength(2);
    expect(allAttempts[0].status).toBe("STARTED");
    expect(allAttempts[1].status).toBe("SUCCESS");

    // Exactly one successful attempt
    const successAttempts = allAttempts.filter(a => a.status === "SUCCESS");
    expect(successAttempts).toHaveLength(1);

    // Running worker again must skip and not produce duplicate publish
    const secondRunResults = await processDueSchedules(new Date());
    expect(secondRunResults).toHaveLength(0); // already marked PUBLISHED
  });

  /**
   * PROBE 6:
   * Swap the adapter in configuration, for example telegram to mock_x.
   * The same campaign publishes through the mock. No code change outside the adapters.
   */
  it("PROBE 6 — Swap adapter in configuration without modifying business logic", async () => {
    // 1. Start with a platform configured with Telegram
    const platform = await prisma.platform.create({
      data: {
        name: "Flexible Channel",
        adapterKey: "telegram",
        maxLength: 4096,
        tone: "informative",
        maxHashtags: 10
      }
    });

    const telegramAdapter = createPublisherAdapter(platform);
    expect(telegramAdapter.constructor.name).toBe("TelegramAdapter");

    const telegramResult = await publishContentService({
      platform,
      content: "Swappable campaign post",
      idempotencyKey: "probe-6-telegram-test"
    });
    expect(telegramResult.adapterKey).toBe("telegram");

    // 2. Perform configuration swap: switch adapterKey from telegram to mock x (or linkedin)
    const updatedPlatform = await prisma.platform.update({
      where: { id: platform.id },
      data: { adapterKey: "x" }
    });

    const xAdapter = createPublisherAdapter(updatedPlatform);
    expect(xAdapter.constructor.name).toBe("XAdapter");

    // Business logic publishes identically through the SocialPublisher interface
    const xResult = await publishContentService({
      platform: updatedPlatform,
      content: "Swappable campaign post",
      idempotencyKey: "probe-6-x-test"
    });

    expect(xResult.adapterKey).toBe("x");
    expect(xResult.preview).toBe("[Mock X] Swappable campaign post");
    expect(xResult.externalMessageId).toBe("mock-x-probe-6-x-test");
  });
});
