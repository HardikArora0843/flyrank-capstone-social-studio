import { Router } from "express";

import {
  getPublishHistoryController,
  getPublishHistoryByIdController
} from "../controllers/publishAttemptController.js";

const router = Router();

router.get("/", getPublishHistoryController);
router.get("/:id", getPublishHistoryByIdController);

export default router;
