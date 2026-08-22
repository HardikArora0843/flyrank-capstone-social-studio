import {
  createVariantService,
  getVariantsByPostIdService,
  getVariantByIdService
} from "../services/variantService.js";

import {
  getPlatformByIdService
} from "../services/platformService.js";

import {
  validateCreateVariant
} from "../validators/variantValidator.js";

import {
  validatePlatformConstraints
} from "../services/variantConstraintService.js";

export const createVariantController = async (req, res) => {
  const validationError = validateCreateVariant(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const platform = await getPlatformByIdService(req.body.platformId);

    if (!platform) {
      return res.status(404).json({
        error: "Platform not found"
      });
    }

    const constraintErrors = validatePlatformConstraints({
      content: req.body.content,
      platform
    });

    if (constraintErrors.length > 0) {
      return res.status(400).json({
        error: "Variant violates platform constraints",
        details: constraintErrors
      });
    }

    const variant = await createVariantService(req.body);

    return res.status(201).json(variant);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create variant"
    });
  }
};

export const getVariantsByPostIdController = async (req, res) => {
  try {
    const variants = await getVariantsByPostIdService(req.params.postId);

    return res.status(200).json(variants);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch variants"
    });
  }
};

export const getVariantByIdController = async (req, res) => {
  try {
    const variant = await getVariantByIdService(req.params.id);

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found"
      });
    }

    return res.status(200).json(variant);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch variant"
    });
  }
};
