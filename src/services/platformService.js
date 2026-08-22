import {
  createPlatform,
  getPlatforms,
  getPlatformById
} from "../repositories/platformRepository.js";

export const createPlatformService = async (data) => {
  return createPlatform(data);
};

export const getPlatformsService = async () => {
  return getPlatforms();
};

export const getPlatformByIdService = async (id) => {
  return getPlatformById(id);
};
