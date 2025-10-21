import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3005,
  mongoUri: process.env.MONGO_URI as string,
  rabbitUrl: process.env.RABBITMQ_URL as string,
  serviceName: process.env.SERVICE_NAME || "notification-service",
};
