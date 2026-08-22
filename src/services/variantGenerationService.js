import {
  createVariant
} from "../repositories/variantRepository.js";

import {
  getPlatforms
} from "../repositories/platformRepository.js";

import {
  enforcePlatformConstraints
} from "./variantConstraintService.js";

const buildBaseContent = (post) => {
  if (post.sourceType === "markdown") {
    return post.content?.trim() ?? "";
  }

  if (post.sourceType === "url") {
    return `New blog post: ${post.sourceUrl}`;
  }

  return "";
};

const applyTone = (content, tone) => {
  const normalizedTone = tone.trim().toLowerCase();

  if (normalizedTone === "concise") {
    return content
      .replace(/\s+/g, " ")
      .trim();
  }

  if (normalizedTone === "professional") {
    return content
      .replace(/\s+/g, " ")
      .trim();
  }

  if (normalizedTone === "casual") {
    return content
      .replace(/\s+/g, " ")
      .trim();
  }

  return content.trim();
};

export const generateVariantsForPost = async (post) => {
  const platforms = await getPlatforms();

  const baseContent = buildBaseContent(post);

  const variants = [];

  for (const platform of platforms) {
    const tonedContent = applyTone(
      baseContent,
      platform.tone
    );

    const content = enforcePlatformConstraints({
      content: tonedContent,
      platform
    });

    const variant = await createVariant({
      postId: post.id,
      platformId: platform.id,
      content,
      status: "DRAFT"
    });

    variants.push(variant);
  }

  return variants;
};
