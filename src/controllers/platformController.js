import {
  createPlatformService,
  getPlatformsService,
  getPlatformByIdService
} from "../services/platformService.js";

import { validateCreatePlatform } from "../validators/platformValidator.js";

export const createPlatformController = async (req, res) => {
  const validationError = validateCreatePlatform(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const platform = await createPlatformService(req.body);

    return res.status(201).json(platform);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create platform"
    });
  }
};

export const getPlatformsController = async (req, res) => {
  try {
    const platforms = await getPlatformsService();

    return res.status(200).json(platforms);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch platforms"
    });
  }
};

export const getPlatformByIdController = async (req, res) => {
  try {
    const platform = await getPlatformByIdService(req.params.id);

    if (!platform) {
      return res.status(404).json({
        error: "Platform not found"
      });
    }

    return res.status(200).json(platform);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch platform"
    });
  }
};
