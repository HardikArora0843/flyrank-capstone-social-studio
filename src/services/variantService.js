import {
  createVariant,
  getVariantsByPostId,
  getVariantById,
  updateVariant
} from "../repositories/variantRepository.js";

export const createVariantService = async (data) => {
  return createVariant(data);
};

export const getVariantsByPostIdService = async (postId) => {
  return getVariantsByPostId(postId);
};

export const getVariantByIdService = async (id) => {
  return getVariantById(id);
};

export const updateVariantService = async (id, data) => {
  return updateVariant(id, data);
};
