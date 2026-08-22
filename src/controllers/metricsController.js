import {
  getPublishingMetricsService
} from "../services/metricsService.js";

export const getPublishingMetricsController = async (req, res) => {
  try {
    const metrics = await getPublishingMetricsService();

    return res.status(200).json(metrics);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch publishing metrics"
    });
  }
};
