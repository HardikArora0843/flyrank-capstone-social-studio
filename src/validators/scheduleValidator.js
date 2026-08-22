export const validateCreateSchedule = (body) => {
  const {
    variantId,
    scheduledFor,
    idempotencyKey
  } = body;

  if (!variantId) {
    return "variantId is required";
  }

  if (!scheduledFor) {
    return "scheduledFor is required";
  }

  const scheduledDate = new Date(scheduledFor);

  if (Number.isNaN(scheduledDate.getTime())) {
    return "scheduledFor must be a valid date";
  }

  if (!idempotencyKey) {
    return "idempotencyKey is required";
  }

  return null;
};
