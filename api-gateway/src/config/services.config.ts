import ENV from "./env.js";

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  timeout?: number;
  requiresAuth?: boolean;
  description?: string;
}

export const services: ServiceConfig[] = [
  {
    name: "auth",
    url: ENV.AUTH_SERVICE_URL,
    path: "/api/auth",
    timeout: 10000,
    requiresAuth: false,
    description: "Authentication and authorization service",
  },
  // Comentamos los otros servicios temporalmente
  // {
  //   name: "user",
  //   url: ENV.USER_SERVICE_URL,
  //   path: "/api/user",
  //   timeout: 10000,
  //   requiresAuth: true,
  //   description: "User management and profiles",
  // },
  // {
  //   name: "appointment",
  //   url: ENV.APPOINTMENT_SERVICE_URL,
  //   path: "/api/appointment",
  //   timeout: 10000,
  //   requiresAuth: true,
  //   description: "Medical appointments management",
  // },
  // {
  //   name: "medicalRecord",
  //   url: ENV.MEDICAL_RECORD_SERVICE_URL,
  //   path: "/api/medical-record",
  //   timeout: 15000,
  //   requiresAuth: true,
  //   description: "Medical records and file management",
  // },
  // {
  //   name: "notification",
  //   url: ENV.NOTIFICATION_SERVICE_URL,
  //   path: "/api/notification",
  //   timeout: 10000,
  //   requiresAuth: true,
  //   description: "Notification service (email, SMS, push)",
  // },
  // {
  //   name: "billing",
  //   url: ENV.BILLING_SERVICE_URL,
  //   path: "/api/billing",
  //   timeout: 15000,
  //   requiresAuth: true,
  //   description: "Billing and payment processing",
  // },
  // {
  //   name: "subscription",
  //   url: ENV.SUBSCRIPTION_SERVICE_URL,
  //   path: "/api/subscription",
  //   timeout: 10000,
  //   requiresAuth: true,
  //   description: "Subscription and freemium model management",
  // },
];

export const getServiceByPath = (path: string): ServiceConfig | undefined => {
  return services.find((service) => path.startsWith(service.path));
};

export const getServiceByName = (name: string): ServiceConfig | undefined => {
  return services.find((service) => service.name === name);
};
