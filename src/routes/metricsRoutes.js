import { Router } from "express";

import {
  getPublishingMetricsController
} from "../controllers/metricsController.js";

const router = Router();

router.get("/publishing", getPublishingMetricsController);

export default router;
