import {
  createVariantService,
  getVariantsByPostIdService,
  getVariantByIdService,
  updateVariantService
} from "../services/variantService.js";

import {
  getPlatformByIdService
} from "../services/platformService.js";

import {
  getPostByIdService
} from "../services/postService.js";

import {
  validateCreateVariant,
  validateUpdateVariant
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
    const post = await getPostByIdService(req.body.postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

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

export const updateVariantController = async (req, res) => {
  const validationError = validateUpdateVariant(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  try {
    const variant = await getVariantByIdService(req.params.id);

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found"
      });
    }

    if (variant.status === "PUBLISHED") {
      return res.status(409).json({
        error: "Cannot edit a published variant"
      });
    }

    const constraintErrors = validatePlatformConstraints({
      content: req.body.content,
      platform: variant.platform
    });

    if (constraintErrors.length > 0) {
      return res.status(400).json({
        error: "Variant violates platform constraints",
        details: constraintErrors
      });
    }

    const updatedVariant = await updateVariantService(variant.id, {
      content: req.body.content.trim(),
      status: "DRAFT"
    });

    return res.status(200).json(updatedVariant);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update variant"
    });
  }
};

export const approveVariantController = async (req, res) => {
  try {
    const variant = await getVariantByIdService(req.params.id);

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found"
      });
    }

    if (
      variant.status !== "DRAFT" &&
      variant.status !== "REJECTED"
    ) {
      return res.status(409).json({
        error: `Cannot approve variant with status ${variant.status}`
      });
    }

    const constraintErrors = validatePlatformConstraints({
      content: variant.content,
      platform: variant.platform
    });

    if (constraintErrors.length > 0) {
      return res.status(400).json({
        error: "Variant violates platform constraints",
        details: constraintErrors
      });
    }

    const approvedVariant = await updateVariantService(
      variant.id,
      {
        status: "APPROVED"
      }
    );

    return res.status(200).json(approvedVariant);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to approve variant"
    });
  }
};

export const rejectVariantController = async (req, res) => {
  try {
    const variant = await getVariantByIdService(req.params.id);

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found"
      });
    }

    if (
      variant.status !== "DRAFT" &&
      variant.status !== "APPROVED"
    ) {
      return res.status(409).json({
        error: `Cannot reject variant with status ${variant.status}`
      });
    }

    const rejectedVariant = await updateVariantService(
      variant.id,
      {
        status: "REJECTED"
      }
    );

    return res.status(200).json(rejectedVariant);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to reject variant"
    });
  }
};
