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
