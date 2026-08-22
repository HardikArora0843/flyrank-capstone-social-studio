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