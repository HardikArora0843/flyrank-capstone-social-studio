import express from "express";

import {
  createVariantController,
  getVariantsByPostIdController,
  getVariantByIdController
} from "../controllers/variantController.js";

const router = express.Router();

router.post("/", createVariantController);
router.get("/post/:postId", getVariantsByPostIdController);
router.get("/:id", getVariantByIdController);

export default router;
