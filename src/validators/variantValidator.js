const allowedStatuses = [
  "DRAFT",
  "APPROVED",
  "REJECTED",
  "PUBLISHED"
];

export const validateCreateVariant = (body) => {
  const {
    postId,
    platformId,
    content,
    status
  } = body;

  if (!postId) {
    return "postId is required";
  }

  if (!platformId) {
    return "platformId is required";
  }

  if (!content) {
    return "content is required";
  }

  if (status !== undefined && !allowedStatuses.includes(status)) {
    return "status must be one of DRAFT, APPROVED, REJECTED, PUBLISHED";
  }

  return null;
};

export const validateUpdateVariant = (body) => {
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return "content is required";
  }

  return null;
};
