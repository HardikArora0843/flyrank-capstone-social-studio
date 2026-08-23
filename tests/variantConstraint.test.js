import { describe, expect, it } from "vitest";

import {
  enforcePlatformConstraints,
  validatePlatformConstraints
} from "../src/services/variantConstraintService.js";

describe("Variant platform constraints", () => {
  const platform = {
    maxLength: 20,
    maxHashtags: 2,
    tone: "professional"
  };

  it("accepts content within platform constraints", () => {
    const content = "Short post";

    expect(
      validatePlatformConstraints({
        content,
        platform
      })
    ).toEqual([]);
  });

  it("rejects content exceeding maximum length", () => {
    const content = "This content is definitely too long";

    expect(
      validatePlatformConstraints({
        content,
        platform
      })
    ).toEqual([
      "content exceeds maximum length of 20"
    ]);
  });

  it("rejects content exceeding maximum hashtag count", () => {
    const content = "#one #two #three";

    expect(
      validatePlatformConstraints({
        content,
        platform
      })
    ).toEqual([
      "content exceeds maximum hashtag count of 2"
    ]);
  });

  it("reports both length and hashtag violations", () => {
    const content =
      "This is a very long post #one #two #three";

    expect(
      validatePlatformConstraints({
        content,
        platform
      })
    ).toEqual([
      "content exceeds maximum length of 20",
      "content exceeds maximum hashtag count of 2"
    ]);
  });

  it("rejects content that violates the platform tone rule", () => {
    const content = "lol this launch is amazing!!!";

    expect(
      validatePlatformConstraints({
        content,
        platform
      })
    ).toEqual([
      "content exceeds maximum length of 20",
      "content does not match professional tone"
    ]);
  });

  it("truncates content to the platform maximum length", () => {
    const content =
      "This is content that exceeds the platform limit";

    const constrained = enforcePlatformConstraints({
      content,
      platform
    });

    expect(constrained.length).toBeLessThanOrEqual(
      platform.maxLength
    );
  });

  it("removes hashtags beyond the platform maximum", () => {
    const content = "Post #one #two #three #four";

    const constrained = enforcePlatformConstraints({
      content,
      platform
    });

    expect(constrained).toBe("Post #one #two");
  });

  it("produces content satisfying both platform constraints", () => {
    const content =
      "This is a long post with #one #two #three #four";

    const constrained = enforcePlatformConstraints({
      content,
      platform
    });

    const errors = validatePlatformConstraints({
      content: constrained,
      platform
    });

    expect(errors).toEqual([]);
    expect(constrained.length).toBeLessThanOrEqual(
      platform.maxLength
    );
  });
});
