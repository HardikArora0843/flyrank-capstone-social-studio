export const validateCreatePost = (body) => {
  const { sourceType, sourceUrl, content } = body;

  if (!sourceType) {
    return "sourceType is required";
  }

  if (!["url", "markdown"].includes(sourceType)) {
    return "sourceType must be either url or markdown";
  }

  if (sourceType === "url" && !sourceUrl) {
    return "sourceUrl is required when sourceType is url";
  }

  if (sourceType === "markdown" && !content) {
    return "content is required when sourceType is markdown";
  }

  if (sourceType === "url" && content) {
    return "content must not be provided when sourceType is url";
  }

  if (sourceType === "markdown" && sourceUrl) {
    return "sourceUrl must not be provided when sourceType is markdown";
  }

  return null;
};