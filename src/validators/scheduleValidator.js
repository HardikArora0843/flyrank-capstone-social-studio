export const validateCreateSchedule = (body) => {
  const {
    variantId,
    scheduledFor
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

  return null;
};
