import {
  getPublishingMetrics
} from "../repositories/metricsRepository.js";

export const getPublishingMetricsService = async () => {
  return getPublishingMetrics();
};
