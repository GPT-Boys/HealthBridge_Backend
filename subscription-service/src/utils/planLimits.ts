export enum PlanType {
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export interface PlanLimits {
  appointments: {
    monthly: number;
    concurrent: number;
  };
  storage: {
    maxSizeMB: number;
    filesPerRecord: number;
  };
  features: {
    telemedicine: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    multiClinic: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.BASIC]: {
    appointments: {
      monthly: 2,
      concurrent: 1,
    },
    storage: {
      maxSizeMB: 100,
      filesPerRecord: 1,
    },
    features: {
      telemedicine: false,
      advancedReports: false,
      apiAccess: false,
      multiClinic: false,
      prioritySupport: false,
      customBranding: false,
    },
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
  },
  [PlanType.PREMIUM]: {
    appointments: {
      monthly: 10,
      concurrent: 3,
    },
    storage: {
      maxSizeMB: 500,
      filesPerRecord: 5,
    },
    features: {
      telemedicine: true,
      advancedReports: false,
      apiAccess: false,
      multiClinic: false,
      prioritySupport: true,
      customBranding: false,
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
    },
  },
  [PlanType.ENTERPRISE]: {
    appointments: {
      monthly: -1, // unlimited
      concurrent: -1, // unlimited
    },
    storage: {
      maxSizeMB: -1, // unlimited
      filesPerRecord: -1, // unlimited
    },
    features: {
      telemedicine: true,
      advancedReports: true,
      apiAccess: true,
      multiClinic: true,
      prioritySupport: true,
      customBranding: true,
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
    },
  },
};

export const getPlanLimits = (planType: PlanType): PlanLimits => {
  return PLAN_LIMITS[planType];
};

export const checkLimit = (
  planType: PlanType,
  feature: string,
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } => {
  const limits = getPlanLimits(planType);

  // Navigate nested object
  const getNestedValue = (obj: any, path: string): any => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  const limit = getNestedValue(limits, feature);

  if (limit === undefined) {
    return { allowed: false, limit: 0, remaining: 0 };
  }

  if (limit === -1) {
    // Unlimited
    return { allowed: true, limit: -1, remaining: -1 };
  }

  if (typeof limit === "boolean") {
    return { allowed: limit, limit: limit ? 1 : 0, remaining: limit ? 1 : 0 };
  }

  const allowed = currentUsage < limit;
  const remaining = Math.max(0, limit - currentUsage);

  return { allowed, limit, remaining };
};
