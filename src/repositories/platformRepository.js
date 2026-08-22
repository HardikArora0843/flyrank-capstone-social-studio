import prisma from "../config/database.js";

export const createPlatform = async ({
  name,
  adapterKey,
  maxLength,
  tone,
  maxHashtags
}) => {
  return prisma.platform.create({
    data: {
      name,
      adapterKey,
      maxLength,
      tone,
      maxHashtags
    }
  });
};

export const getPlatforms = async () => {
  return prisma.platform.findMany({
    orderBy: {
      name: "asc"
    }
  });
};

export const getPlatformById = async (id) => {
  return prisma.platform.findUnique({
    where: {
      id
    }
  });
};