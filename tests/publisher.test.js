import { describe, expect, it } from "vitest";

import { createPublisherAdapter } from "../src/adapters/index.js";
import { publishContentService } from "../src/services/publisherService.js";

const platforms = {
  x: {
    id: "platform-x",
    name: "X",
    adapterKey: "x",
    maxLength: 280,
    tone: "concise",
    maxHashtags: 3
  },
  linkedin: {
    id: "platform-linkedin",
    name: "LinkedIn",
    adapterKey: "linkedin",
    maxLength: 3000,
    tone: "professional",
    maxHashtags: 5
  },
  telegram: {
    id: "platform-telegram",
    name: "Telegram",
    adapterKey: "telegram",
    maxLength: 4096,
    tone: "informative",
    maxHashtags: 10
  }
};

describe("Publisher adapters", () => {
  it("creates the X adapter", () => {
    const adapter = createPublisherAdapter(platforms.x);

    expect(adapter.platform).toEqual(platforms.x);
  });

  it("creates the LinkedIn adapter", () => {
    const adapter = createPublisherAdapter(platforms.linkedin);

    expect(adapter.platform).toEqual(platforms.linkedin);
  });

  it("creates the Telegram adapter", () => {
    const adapter = createPublisherAdapter(platforms.telegram);

    expect(adapter.platform).toEqual(platforms.telegram);
  });

  it("rejects an unsupported adapter", () => {
    expect(() =>
      createPublisherAdapter({
        ...platforms.x,
        adapterKey: "unsupported"
      })
    ).toThrow("Unsupported publisher adapter: unsupported");
  });

  it("publishes content through the X adapter", async () => {
    const result = await publishContentService({
      platform: platforms.x,
      content: "Test X post",
      idempotencyKey: "test-x-key"
    });

    expect(result.platform).toBe("X");
    expect(result.adapterKey).toBe("x");
    expect(result.externalMessageId).toBe("mock-x-test-x-key");
    expect(result.content).toBe("Test X post");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("publishes content through the LinkedIn adapter", async () => {
    const result = await publishContentService({
      platform: platforms.linkedin,
      content: "Test LinkedIn post",
      idempotencyKey: "test-linkedin-key"
    });

    expect(result.platform).toBe("LinkedIn");
    expect(result.adapterKey).toBe("linkedin");
    expect(result.externalMessageId).toBe(
      "mock-linkedin-test-linkedin-key"
    );
    expect(result.content).toBe("Test LinkedIn post");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("publishes content through the Telegram adapter", async () => {
    const result = await publishContentService({
      platform: platforms.telegram,
      content: "Test Telegram post",
      idempotencyKey: "test-telegram-key"
    });

    expect(result.platform).toBe("Telegram");
    expect(result.adapterKey).toBe("telegram");
    expect(result.externalMessageId).toBe(
      "mock-telegram-test-telegram-key"
    );
    expect(result.content).toBe("Test Telegram post");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});
