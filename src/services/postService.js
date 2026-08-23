import {
  createPost,
  getPosts,
  getPostById
} from "../repositories/postRepository.js";

import {
  generateVariantsForPost
} from "./variantGenerationService.js";

const extractTextFromHtml = (html) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const fetchUrlContent = async (sourceUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal
    });

    if (!response.ok) {
      return `Source URL: ${sourceUrl}`;
    }

    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      return extractTextFromHtml(body) || `Source URL: ${sourceUrl}`;
    }

    return body.trim() || `Source URL: ${sourceUrl}`;
  } catch {
    return `Source URL: ${sourceUrl}`;
  } finally {
    clearTimeout(timeout);
  }
};

export const createPostService = async (data) => {
  const postData = { ...data };

  if (postData.sourceType === "url") {
    postData.content = await fetchUrlContent(postData.sourceUrl);
  }

  const post = await createPost(postData);

  await generateVariantsForPost(post);

  return post;
};

export const getPostsService = async () => {
  return getPosts();
};

export const getPostByIdService = async (id) => {
  return getPostById(id);
};
