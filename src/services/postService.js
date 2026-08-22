import {
  createPost,
  getPosts,
  getPostById
} from "../repositories/postRepository.js";

export const createPostService = async (data) => {
  return createPost(data);
};

export const getPostsService = async () => {
  return getPosts();
};

export const getPostByIdService = async (id) => {
  return getPostById(id);
};