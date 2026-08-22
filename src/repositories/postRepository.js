import prisma from "../config/database.js";

export const createPost = async ({ sourceType, sourceUrl, content }) => {
  return prisma.post.create({
    data: {
      sourceType,
      sourceUrl,
      content
    }
  });
};

export const getPosts = async () => {
  return prisma.post.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
};

export const getPostById = async (id) => {
  return prisma.post.findUnique({
    where: {
      id
    }
  });
};