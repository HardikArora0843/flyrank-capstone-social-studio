export const validateCreatePlatform = (body) => {
  const {
    name,
    adapterKey,
    maxLength,
    tone,
    maxHashtags
  } = body;

  if (!name) {
    return "name is required";
  }

  if (!adapterKey) {
    return "adapterKey is required";
  }

  if (!Number.isInteger(maxLength) || maxLength <= 0) {
    return "maxLength must be a positive integer";
  }

  if (!tone) {
    return "tone is required";
  }

  if (!Number.isInteger(maxHashtags) || maxHashtags < 0) {
    return "maxHashtags must be a non-negative integer";
  }

  return null;
};