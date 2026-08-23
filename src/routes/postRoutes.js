import express from "express";

import {
  createPostController,
  getPostsController,
  getPostByIdController,
  generatePostVariantsController,
  getPostVariantsController
} from "../controllers/postController.js";

const router = express.Router();

router.post("/", createPostController);
router.get("/", getPostsController);
router.get("/:id", getPostByIdController);
router.post("/:id/variants", generatePostVariantsController);
router.get("/:id/variants", getPostVariantsController);

export default router;