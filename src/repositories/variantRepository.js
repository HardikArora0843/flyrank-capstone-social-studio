import prisma from "../config/database.js";

export const createVariant = async ({
  postId,
  platformId,
  content,
  status
}) => {
  return prisma.variant.create({
    data: {
      postId,
      platformId,
      content,
      status
    },
    include: {
      post: true,
      platform: true
    }
  });
};

export const getVariantsByPostId = async (postId) => {
  return prisma.variant.findMany({
    where: {
      postId
    },
    include: {
      platform: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
};

export const getVariantById = async (id) => {
  return prisma.variant.findUnique({
    where: {
      id
    },
    include: {
      post: true,
      platform: true
    }
  });
};

export const updateVariant = async (id, data) => {
  return prisma.variant.update({
    where: {
      id
    },
    data,
    include: {
      post: true,
      platform: true
    }
  });
};
