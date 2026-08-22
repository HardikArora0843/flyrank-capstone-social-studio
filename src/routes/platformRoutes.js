import express from "express";

import {
  createPlatformController,
  getPlatformsController,
  getPlatformByIdController
} from "../controllers/platformController.js";

const router = express.Router();

router.post("/", createPlatformController);
router.get("/", getPlatformsController);
router.get("/:id", getPlatformByIdController);

export default router;
