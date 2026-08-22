import {
  createPost,
  getPosts,
  getPostById
} from "../repositories/postRepository.js";

import {
  generateVariantsForPost
} from "./variantGenerationService.js";

export const createPostService = async (data) => {
  const post = await createPost(data);

  await generateVariantsForPost(post);

  return post;
};

export const getPostsService = async () => {
  return getPosts();
};

export const getPostByIdService = async (id) => {
  return getPostById(id);
};
