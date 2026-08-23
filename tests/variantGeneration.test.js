import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetPlatforms, mockCreateVariant } = vi.hoisted(() => ({
  mockGetPlatforms: vi.fn(),
  mockCreateVariant: vi.fn()
}));

vi.mock("../src/repositories/platformRepository.js", () => ({
  getPlatforms: mockGetPlatforms
}));

vi.mock("../src/repositories/variantRepository.js", () => ({
  createVariant: mockCreateVariant
}));

import { generateVariantsForPost } from "../src/services/variantGenerationService.js";

describe("Variant generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetPlatforms.mockResolvedValue([
      {
        id: "linkedin-platform",
        name: "LinkedIn",
        adapterKey: "linkedin",
        maxLength: 3000,
        tone: "professional",
        maxHashtags: 5
      },
      {
        id: "x-platform",
        name: "X",
        adapterKey: "x",
        maxLength: 280,
        tone: "concise",
        maxHashtags: 3
      }
    ]);

    mockCreateVariant.mockImplementation(async (data) => ({
      id: `${data.platformId}-variant`,
      ...data
    }));
  });

  it("generates one variant for every configured platform", async () => {
    const post = {
      id: "post-001",
      sourceType: "markdown",
      content: "This is a test post."
    };

    const variants = await generateVariantsForPost(post);

    expect(variants).toHaveLength(2);
    expect(mockCreateVariant).toHaveBeenCalledTimes(2);
  });

  it("assigns the correct post and platform relationships", async () => {
    const post = {
      id: "post-002",
      sourceType: "markdown",
      content: "Relationship test"
    };

    const variants = await generateVariantsForPost(post);

    expect(variants[0].postId).toBe("post-002");
    expect(variants[0].platformId).toBe("linkedin-platform");

    expect(variants[1].postId).toBe("post-002");
    expect(variants[1].platformId).toBe("x-platform");
  });

  it("creates generated variants with DRAFT status", async () => {
    const post = {
      id: "post-003",
      sourceType: "markdown",
      content: "Draft variant test"
    };

    const variants = await generateVariantsForPost(post);

    expect(variants[0].status).toBe("DRAFT");
    expect(variants[1].status).toBe("DRAFT");

    expect(mockCreateVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "DRAFT"
      })
    );
  });

  it("generates Markdown variants from post content", async () => {
    const post = {
      id: "post-004",
      sourceType: "markdown",
      content: "  Markdown source content  "
    };

    const variants = await generateVariantsForPost(post);

    expect(variants[0].content).toBe("Markdown source content");
    expect(variants[1].content).toBe("Markdown source content");
  });

  it("generates URL variants from the post URL", async () => {
    const post = {
      id: "post-005",
      sourceType: "url",
      sourceUrl: "https://example.com/article"
    };

    const variants = await generateVariantsForPost(post);

    expect(variants[0].content).toBe(
      "Source URL: https://example.com/article"
    );
    expect(variants[1].content).toBe(
      "Source URL: https://example.com/article"
    );
  });

  it("enforces platform maximum length during generation", async () => {
    mockGetPlatforms.mockResolvedValue([
      {
        id: "short-platform",
        name: "Short Platform",
        adapterKey: "short",
        maxLength: 20,
        tone: "professional",
        maxHashtags: 5
      }
    ]);

    const post = {
      id: "post-006",
      sourceType: "markdown",
      content:
        "This is a very long post that exceeds the platform limit."
    };

    const variants = await generateVariantsForPost(post);

    expect(variants).toHaveLength(1);
    expect(variants[0].content.length).toBeLessThanOrEqual(20);
  });

  it("enforces platform maximum hashtag count during generation", async () => {
    mockGetPlatforms.mockResolvedValue([
      {
        id: "hashtag-platform",
        name: "Hashtag Platform",
        adapterKey: "hashtag",
        maxLength: 280,
        tone: "professional",
        maxHashtags: 2
      }
    ]);

    const post = {
      id: "post-007",
      sourceType: "markdown",
      content: "Post content #one #two #three #four"
    };

    const variants = await generateVariantsForPost(post);

    expect(variants).toHaveLength(1);
    expect(variants[0].content).toBe(
      "Post content #one #two"
    );
  });

  it("returns an empty array when no platforms are configured", async () => {
    mockGetPlatforms.mockResolvedValue([]);

    const post = {
      id: "post-008",
      sourceType: "markdown",
      content: "No platform test"
    };

    const variants = await generateVariantsForPost(post);

    expect(variants).toEqual([]);
    expect(mockCreateVariant).not.toHaveBeenCalled();
  });
});
