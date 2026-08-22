import express from "express";

import {
  createPostController,
  getPostsController,
  getPostByIdController
} from "../controllers/postController.js";

const router = express.Router();

router.post("/", createPostController);
router.get("/", getPostsController);
router.get("/:id", getPostByIdController);

export default router;