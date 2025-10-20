export const validatePlanType = (planType: string): boolean => {
  return ["basic", "premium", "enterprise"].includes(planType.toLowerCase());
};

export const validatePaymentMethod = (method: string): boolean => {
  return ["stripe", "cash", "bank_transfer"].includes(method.toLowerCase());
};
