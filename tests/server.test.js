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

  it("rejects a schedule without an idempotency key", async () => {
    const variant = await createVariant();

    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await request(app)
      .post("/api/schedules")
      .send({
        variantId: variant.id,
        scheduledFor
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "idempotencyKey is required"
    });
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
      error: "idempotencyKey already exists"
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
});
