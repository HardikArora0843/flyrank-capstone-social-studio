import {
  createPostService,
  getPostsService,
  getPostByIdService
} from "../services/postService.js";

import { validateCreatePost } from "../validators/postValidator.js";

export const createPostController = async (req, res) => {
  const validationError = validateCreatePost(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const post = await createPostService(req.body);

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create post"
    });
  }
};

export const getPostsController = async (req, res) => {
  try {
    const posts = await getPostsService();

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch posts"
    });
  }
};

export const getPostByIdController = async (req, res) => {
  try {
    const post = await getPostByIdService(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch post"
    });
  }
};

export const generatePostVariantsController = async (req, res) => {
  try {
    const post = await getPostByIdService(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    const { generateVariantsForPost } = await import(
      "../services/variantGenerationService.js"
    );
    const variants = await generateVariantsForPost(post);

    return res.status(201).json(variants);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate variants for post"
    });
  }
};

export const getPostVariantsController = async (req, res) => {
  try {
    const post = await getPostByIdService(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    const { getVariantsByPostIdService } = await import(
      "../services/variantService.js"
    );
    const variants = await getVariantsByPostIdService(req.params.id);

    return res.status(200).json(variants);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch variants for post"
    });
  }
};