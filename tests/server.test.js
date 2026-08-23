import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/server.js";
import prisma from "../src/config/database.js";

describe("Health endpoint", () => {
  it("returns the application status", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: "FlyRank AI Social Media Studio",
      status: "running"
    });
  });
});

describe("Post ingestion", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  it("creates a Markdown post", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Test Blog Post\n\nThis is test content."
      });

    expect(response.status).toBe(201);
    expect(response.body.sourceType).toBe("markdown");
    expect(response.body.content).toBe(
      "# Test Blog Post\n\nThis is test content."
    );
    expect(response.body.id).toBeDefined();
  });

  it("generates platform-specific variants when a post is created", async () => {
    await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content:
          "# Product Launch\n\nWe are excited to announce our new product. Learn more at https://example.com."
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    const variants = await prisma.variant.findMany({
      where: {
        postId: response.body.id
      },
      include: {
        platform: true
      },
      orderBy: {
        platform: {
          name: "asc"
        }
      }
    });

    expect(variants).toHaveLength(2);

    expect(variants.map((variant) => variant.platform.name)).toEqual([
      "LinkedIn",
      "X"
    ]);

    for (const variant of variants) {
      expect(variant.postId).toBe(response.body.id);
      expect(variant.content).toBeTruthy();
      expect(variant.status).toBe("DRAFT");
      expect(variant.content.length).toBeLessThanOrEqual(
        variant.platform.maxLength
      );
    }
  });
  it("creates a URL post", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "url",
        sourceUrl: "https://example.com/blog/test-post"
      });

    expect(response.status).toBe(201);
    expect(response.body.sourceType).toBe("url");
    expect(response.body.sourceUrl).toBe(
      "https://example.com/blog/test-post"
    );
    expect(response.body.id).toBeDefined();
  });

  it("rejects a Markdown post without content", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "content is required when sourceType is markdown"
    });
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "url",
        sourceUrl: "not-a-valid-url"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "sourceUrl must be a valid URL"
    });
  });

  it("rejects a non-http URL", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "url",
        sourceUrl: "ftp://example.com/file"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "sourceUrl must use http or https"
    });
  });

  it("retrieves a created post by id", async () => {
    const created = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Stored Post"
      });

    const response = await request(app).get(
      `/api/posts/${created.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.content).toBe("# Stored Post");
  });

  it("returns the stored posts", async () => {
    await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# First Post"
      });

    await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Second Post"
      });

    const response = await request(app).get("/api/posts");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("returns 404 for a missing post", async () => {
    const response = await request(app).get(
      "/api/posts/non-existent-post"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Post not found"
    });
  });
});

describe("Platform configuration", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  it("creates a platform", async () => {
    const response = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("LinkedIn");
    expect(response.body.adapterKey).toBe("linkedin");
    expect(response.body.maxLength).toBe(3000);
    expect(response.body.tone).toBe("professional");
    expect(response.body.maxHashtags).toBe(5);
    expect(response.body.id).toBeDefined();
  });

  it("rejects a platform without a name", async () => {
    const response = await request(app)
      .post("/api/platforms")
      .send({
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "name is required"
    });
  });

  it("rejects a platform with an invalid maxLength", async () => {
    const response = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 0,
        tone: "professional",
        maxHashtags: 5
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "maxLength must be a positive integer"
    });
  });

  it("rejects a platform with an invalid maxHashtags", async () => {
    const response = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: -1
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "maxHashtags must be a non-negative integer"
    });
  });

  it("retrieves a platform by id", async () => {
    const created = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app).get(
      `/api/platforms/${created.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.name).toBe("X");
  });

  it("returns the configured platforms", async () => {
    await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app).get("/api/platforms");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe("LinkedIn");
    expect(response.body[1].name).toBe("X");
  });

  it("returns 404 for a missing platform", async () => {
    const response = await request(app).get(
      "/api/platforms/non-existent-platform"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Platform not found"
    });
  });
});

describe("Variant management", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  it("creates a variant for a post and platform", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Product Launch\n\nOur new product is now available."
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Our new product is now available. Learn more today."
      });

    expect(response.status).toBe(201);
    expect(response.body.postId).toBe(post.body.id);
    expect(response.body.platformId).toBe(platform.body.id);
    expect(response.body.content).toBe(
      "Our new product is now available. Learn more today."
    );
    expect(response.body.status).toBe("DRAFT");
    expect(response.body.post.id).toBe(post.body.id);
    expect(response.body.platform.id).toBe(platform.body.id);
  });

  it("creates a variant with an explicit status", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Approved Content"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Approved social post",
        status: "APPROVED"
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("APPROVED");
  });

  it("rejects a variant without postId", async () => {
    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        platformId: platform.body.id,
        content: "Missing post relationship"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "postId is required"
    });
  });

  it("rejects a variant without platformId", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Missing Platform"
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        content: "Missing platform relationship"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "platformId is required"
    });
  });

  it("rejects a variant without content", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Missing Variant Content"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "content is required"
    });
  });

  it("rejects an invalid variant status", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Invalid Status"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const response = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Invalid status test",
        status: "INVALID"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:
        "status must be one of DRAFT, APPROVED, REJECTED, PUBLISHED"
    });
  });

  it("retrieves variants for a post", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Multi Platform Post"
      });

    const linkedin = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const x = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: linkedin.body.id,
        content: "Professional version"
      });

    await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: x.body.id,
        content: "Concise version"
      });

    const response = await request(app).get(
      `/api/variants/post/${post.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].platform.name).toBe("LinkedIn");
    expect(response.body[1].platform.name).toBe("X");
  });

  it("retrieves a variant by id", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Stored Variant"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const created = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Stored variant content"
      });

    const response = await request(app).get(
      `/api/variants/${created.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.content).toBe("Stored variant content");
    expect(response.body.post.id).toBe(post.body.id);
    expect(response.body.platform.id).toBe(platform.body.id);
  });

  it("returns 404 for a missing variant", async () => {
    const response = await request(app).get(
      "/api/variants/non-existent-variant"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Variant not found"
    });
  });

  it("edits a variant and resets its status to DRAFT", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Editable Post"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Original draft content",
        status: "APPROVED"
      });

    const response = await request(app)
      .patch(`/api/variants/${variant.body.id}`)
      .send({
        content: "Updated professional content for review"
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(variant.body.id);
    expect(response.body.content).toBe("Updated professional content for review");
    expect(response.body.status).toBe("DRAFT");
  });

  it("approves a DRAFT variant", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Approvable Post"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "High quality professional post"
      });

    const response = await request(app)
      .post(`/api/variants/${variant.body.id}/approve`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(variant.body.id);
    expect(response.body.status).toBe("APPROVED");
  });

  it("rejects a variant", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Rejectable Post"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Short post"
      });

    const response = await request(app)
      .post(`/api/variants/${variant.body.id}/reject`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(variant.body.id);
    expect(response.body.status).toBe("REJECTED");
  });

  it("allows generating variants via POST /api/posts/:id/variants", async () => {
    await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Regeneration Test"
      });

    const response = await request(app)
      .post(`/api/posts/${post.body.id}/variants`);

    expect(response.status).toBe(201);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);

    const getVariants = await request(app)
      .get(`/api/posts/${post.body.id}/variants`);

    expect(getVariants.status).toBe(200);
    expect(Array.isArray(getVariants.body)).toBe(true);
  });

  it("allows scheduling via POST /api/variants/:id/schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Variant Route Scheduling"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Approved tweet",
        status: "APPROVED"
      });

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post(`/api/variants/${variant.body.id}/schedule`)
      .send({
        scheduledFor,
        idempotencyKey: "schedule-variant-route-001"
      });

    expect(response.status).toBe(201);
    expect(response.body.variantId).toBe(variant.body.id);
    expect(response.body.status).toBe("PENDING");
  });
  it("cancels a pending schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Cancelled Schedule"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Content that will be cancelled",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "cancel-pending-001"
      });

    const response = await request(app).patch(
      `/api/schedules/${schedule.body.id}/cancel`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(schedule.body.id);
    expect(response.body.status).toBe("CANCELLED");
  });

  it("rejects cancellation of a published schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Published Schedule"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Published content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "cancel-published-001"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "PUBLISHED"
      }
    });

    const response = await request(app).patch(
      `/api/schedules/${schedule.body.id}/cancel`
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Cannot cancel schedule with status PUBLISHED"
    });
  });

  it("rejects cancellation of an already cancelled schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Already Cancelled"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Already cancelled content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "cancel-again-001"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "CANCELLED"
      }
    });

    const response = await request(app).patch(
      `/api/schedules/${schedule.body.id}/cancel`
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Cannot cancel schedule with status CANCELLED"
    });
  });

  it("returns 404 when cancelling a missing schedule", async () => {
    const response = await request(app).patch(
      "/api/schedules/non-existent-schedule/cancel"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Schedule not found"
    });
  });
  it("retries a failed schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Retry Schedule"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Retry content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "retry-schedule-001"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "FAILED"
      }
    });

    await prisma.publishAttempt.create({
      data: {
        scheduleId: schedule.body.id,
        variantId: variant.body.id,
        platform: "x",
        idempotencyKey: "retry-schedule-001",
        status: "FAILED",
        attemptNumber: 1,
        error: "Temporary publishing failure"
      }
    });

    const response = await request(app).post(
      `/api/schedules/${schedule.body.id}/retry`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(schedule.body.id);
    expect(response.body.status).toBe("PENDING");
  });

  it("rejects retrying a published schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Published Retry"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Published content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "retry-published-001"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "PUBLISHED"
      }
    });

    const response = await request(app).post(
      `/api/schedules/${schedule.body.id}/retry`
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Cannot retry schedule with status PUBLISHED"
    });
  });

  it("rejects retry after maximum publish attempts", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Retry Limit"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Retry limit content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "retry-limit-001"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "FAILED"
      }
    });

    await prisma.publishAttempt.create({
      data: {
        scheduleId: schedule.body.id,
        variantId: variant.body.id,
        platform: "x",
        idempotencyKey: "retry-limit-001",
        status: "FAILED",
        attemptNumber: 3,
        error: "Permanent publishing failure"
      }
    });

    const response = await request(app).post(
      `/api/schedules/${schedule.body.id}/retry`
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Maximum publish attempts reached",
      attemptNumber: 3
    });
  });

  it("returns 404 when retrying a missing schedule", async () => {
    const response = await request(app).post(
      "/api/schedules/non-existent-schedule/retry"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Schedule not found"
    });
  });
  it("returns publish attempts for a schedule", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Publish Attempt History"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Attempt history content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(),
        idempotencyKey: "attempt-history-001"
      });

    await prisma.publishAttempt.createMany({
      data: [
        {
          scheduleId: schedule.body.id,
          variantId: variant.body.id,
          platform: "x",
          idempotencyKey: "attempt-history-001",
          status: "FAILED",
          attemptNumber: 1,
          error: "Temporary failure"
        },
        {
          scheduleId: schedule.body.id,
          variantId: variant.body.id,
          platform: "x",
          idempotencyKey: "attempt-history-001",
          status: "SUCCESS",
          attemptNumber: 2,
          externalMessageId: "mock-x-attempt-history-001",
          publishedAt: new Date()
        }
      ]
    });

    const response = await request(app).get(
      `/api/schedules/${schedule.body.id}/attempts`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].attemptNumber).toBe(1);
    expect(response.body[0].status).toBe("FAILED");
    expect(response.body[1].attemptNumber).toBe(2);
    expect(response.body[1].status).toBe("SUCCESS");
  });

  it("returns 404 for publish attempts of a missing schedule", async () => {
    const response = await request(app).get(
      "/api/schedules/non-existent-schedule/attempts"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Schedule not found"
    });
  });

  it("returns visible publish history with previews", async () => {
    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Visible History"
      }
    });

    const platform = await prisma.platform.create({
      data: {
        name: "History X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: platform.id,
        content: "History content",
        status: "PUBLISHED"
      }
    });

    const schedule = await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() - 60 * 1000),
        status: "PUBLISHED",
        idempotencyKey: "history-visible-001"
      }
    });

    const attempt = await prisma.publishAttempt.create({
      data: {
        scheduleId: schedule.id,
        variantId: variant.id,
        platform: "x",
        idempotencyKey: "history-visible-001",
        status: "SUCCESS",
        attemptNumber: 1,
        externalMessageId: "mock-x-history-visible-001",
        content: "History content",
        preview: "[Mock X] History content",
        publishedAt: new Date()
      }
    });

    const list = await request(app).get("/api/publish-history");

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(attempt.id);
    expect(list.body[0].preview).toBe("[Mock X] History content");

    const detail = await request(app).get(
      `/api/publish-history/${attempt.id}`
    );

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(attempt.id);
  });

  it("returns publishing metrics", async () => {
    const response = await request(app)
      .get("/api/metrics/publishing");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      schedules: {
        total: 0,
        pending: 0,
        processing: 0,
        published: 0,
        failed: 0,
        cancelled: 0
      },
      publishAttempts: {
        total: 0,
        started: 0,
        successful: 0,
        failed: 0
      }
    });
  });

  it("returns publishing metrics with current counts", async () => {
    const post = await prisma.post.create({
      data: {
        sourceType: "markdown",
        content: "# Metrics Test"
      }
    });

    const platform = await prisma.platform.create({
      data: {
        name: "Metrics X",
        adapterKey: "metrics-x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      }
    });

    const variant = await prisma.variant.create({
      data: {
        postId: post.id,
        platformId: platform.id,
        content: "Metrics content",
        status: "APPROVED"
      }
    });

    const pendingSchedule = await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
        idempotencyKey: "metrics-pending-001"
      }
    });

    const publishedSchedule = await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        idempotencyKey: "metrics-published-001",
        status: "PUBLISHED"
      }
    });

    const failedSchedule = await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() + 3 * 60 * 60 * 1000),
        idempotencyKey: "metrics-failed-001",
        status: "FAILED"
      }
    });

    await prisma.schedule.create({
      data: {
        variantId: variant.id,
        scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000),
        idempotencyKey: "metrics-cancelled-001",
        status: "CANCELLED"
      }
    });

    await prisma.publishAttempt.createMany({
      data: [
        {
          scheduleId: pendingSchedule.id,
          variantId: variant.id,
          platform: "metrics-x",
          idempotencyKey: "metrics-pending-001",
          status: "STARTED",
          attemptNumber: 1
        },
        {
          scheduleId: publishedSchedule.id,
          variantId: variant.id,
          platform: "metrics-x",
          idempotencyKey: "metrics-published-001",
          status: "SUCCESS",
          attemptNumber: 1,
          externalMessageId: "mock-metrics-001",
          publishedAt: new Date()
        },
        {
          scheduleId: failedSchedule.id,
          variantId: variant.id,
          platform: "metrics-x",
          idempotencyKey: "metrics-failed-001",
          status: "FAILED",
          attemptNumber: 1,
          error: "Metrics test failure"
        }
      ]
    });

    const response = await request(app)
      .get("/api/metrics/publishing");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      schedules: {
        total: 4,
        pending: 1,
        processing: 0,
        published: 1,
        failed: 1,
        cancelled: 1
      },
      publishAttempts: {
        total: 3,
        started: 1,
        successful: 1,
        failed: 1
      }
    });
  });
});

describe("Schedule management", () => {
  beforeEach(async () => {
    await prisma.publishAttempt.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.post.deleteMany();
  });

  const createVariant = async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Scheduled Post\n\nThis post will be scheduled."
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Scheduled LinkedIn content",
        status: "APPROVED"
      });

    return variant.body;
  };

  it("rejects scheduling a DRAFT variant", async () => {
  const post = await request(app)
    .post("/api/posts")
    .send({
      sourceType: "markdown",
      content: "# Draft Scheduled Post\n\nThis variant is not approved."
    });

  const platform = await request(app)
    .post("/api/platforms")
    .send({
      name: "Draft Schedule Platform",
      adapterKey: "draft-schedule-platform",
      maxLength: 3000,
      tone: "professional",
      maxHashtags: 5
    });

  const variant = await request(app)
    .post("/api/variants")
    .send({
      postId: post.body.id,
      platformId: platform.body.id,
      content: "Draft content that must not be scheduled"
    });

  expect(variant.status).toBe(201);
  expect(variant.body.status).toBe("DRAFT");

  const response = await request(app)
    .post("/api/schedules")
    .send({
      variantId: variant.body.id,
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      idempotencyKey: "schedule-draft-rejected-001"
    });

  expect(response.status).toBe(409);
  expect(response.body).toEqual({
    error: "Only APPROVED variants can be scheduled. Current status: DRAFT"
  });
});

it("rejects scheduling a REJECTED variant", async () => {
  const post = await request(app)
    .post("/api/posts")
    .send({
      sourceType: "markdown",
      content: "# Rejected Scheduled Post\n\nThis variant was rejected."
    });

  const platform = await request(app)
    .post("/api/platforms")
    .send({
      name: "Rejected Schedule Platform",
      adapterKey: "rejected-schedule-platform",
      maxLength: 3000,
      tone: "professional",
      maxHashtags: 5
    });

  const variant = await request(app)
    .post("/api/variants")
    .send({
      postId: post.body.id,
      platformId: platform.body.id,
      content: "Rejected content that must not be scheduled"
    });

  expect(variant.status).toBe(201);
  expect(variant.body.status).toBe("DRAFT");

  const rejected = await request(app)
    .post(`/api/variants/${variant.body.id}/reject`);

  expect(rejected.status).toBe(200);
  expect(rejected.body.status).toBe("REJECTED");

  const response = await request(app)
    .post("/api/schedules")
    .send({
      variantId: variant.body.id,
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      idempotencyKey: "schedule-rejected-001"
    });

  expect(response.status).toBe(409);
  expect(response.body).toEqual({
    error: "Only APPROVED variants can be scheduled. Current status: REJECTED"
  });
});
it("creates a pending schedule", async () => {
    const variant = await createVariant();

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor,
        idempotencyKey: "schedule-test-001"
      });

    expect(response.status).toBe(201);
    expect(response.body.variantId).toBe(variant.id);
    expect(response.body.status).toBe("PENDING");
    expect(response.body.idempotencyKey).toBe("schedule-test-001");
    expect(response.body.variant.id).toBe(variant.id);
  });

  it("rejects a schedule without variantId", async () => {
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        scheduledFor,
        idempotencyKey: "schedule-test-002"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "variantId is required"
    });
  });

  it("rejects a schedule without scheduledFor", async () => {
    const variant = await createVariant();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        idempotencyKey: "schedule-test-003"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "scheduledFor is required"
    });
  });

  it("rejects an invalid scheduledFor value", async () => {
    const variant = await createVariant();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor: "not-a-date",
        idempotencyKey: "schedule-test-004"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "scheduledFor must be a valid date"
    });
  });

  it("generates a schedule idempotency key when one is not supplied", async () => {
    const variant = await createVariant();

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor
      });

    expect(response.status).toBe(201);
    expect(response.body.idempotencyKey).toBe(
      `variant:${variant.id}:slot:${new Date(scheduledFor).toISOString()}`
    );
  });

  it("rejects a duplicate idempotency key", async () => {
    const variant = await createVariant();

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const first = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor,
        idempotencyKey: "schedule-duplicate-key"
      });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor,
        idempotencyKey: "schedule-duplicate-key"
      });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      error:
        "A schedule already exists for this idempotency key or variant slot"
    });
  });

  it("retrieves a schedule by id", async () => {
    const variant = await createVariant();

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const created = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor,
        idempotencyKey: "schedule-retrieve-001"
      });

    const response = await request(app).get(
      `/api/schedules/${created.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.variant.id).toBe(variant.id);
    expect(response.body.status).toBe("PENDING");
  });

  it("returns 404 for a missing schedule", async () => {
    const response = await request(app).get(
      "/api/schedules/non-existent-schedule"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Schedule not found"
    });
  });


  it("returns scheduled jobs ordered by scheduledFor", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Scheduled Posts"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Scheduled content",
        status: "APPROVED"
      });

    const later = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const earlier = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: later,
        idempotencyKey: "schedule-list-later"
      });

    await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: earlier,
        idempotencyKey: "schedule-list-earlier"
      });

    const response = await request(app).get("/api/schedules");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].idempotencyKey).toBe(
      "schedule-list-earlier"
    );
    expect(response.body[1].idempotencyKey).toBe(
      "schedule-list-later"
    );
  });

  it("returns an empty array when no schedules exist", async () => {
    const response = await request(app).get("/api/schedules");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });


  it("filters schedules by PENDING status", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Pending Schedule"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Pending content",
        status: "APPROVED"
      });

    await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        idempotencyKey: "status-filter-pending"
      });

    const response = await request(app)
      .get("/api/schedules")
      .query({ status: "PENDING" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe("PENDING");
    expect(response.body[0].idempotencyKey).toBe(
      "status-filter-pending"
    );
  });

  it("filters schedules by PUBLISHED status", async () => {
    const post = await request(app)
      .post("/api/posts")
      .send({
        sourceType: "markdown",
        content: "# Published Schedule"
      });

    const platform = await request(app)
      .post("/api/platforms")
      .send({
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      });

    const variant = await request(app)
      .post("/api/variants")
      .send({
        postId: post.body.id,
        platformId: platform.body.id,
        content: "Published content",
        status: "APPROVED"
      });

    const schedule = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.body.id,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        idempotencyKey: "status-filter-published"
      });

    await prisma.schedule.update({
      where: {
        id: schedule.body.id
      },
      data: {
        status: "PUBLISHED"
      }
    });

    const response = await request(app)
      .get("/api/schedules")
      .query({ status: "PUBLISHED" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe("PUBLISHED");
    expect(response.body[0].idempotencyKey).toBe(
      "status-filter-published"
    );
  });

  it("rejects an invalid schedule status filter", async () => {
    const response = await request(app)
      .get("/api/schedules")
      .query({ status: "INVALID" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:
        "status must be one of PENDING, PROCESSING, PUBLISHED, FAILED, CANCELLED"
    });
  });});










