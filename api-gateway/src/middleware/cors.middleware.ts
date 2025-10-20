import cors, { type CorsOptions } from "cors";
import { logger } from "../utils/logger.js";
import ENV from "../config/env.js";

const ALLOWED_ORIGINS = ENV.ALLOWED_ORIGINS.split(",");

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request from origin:", { origin });
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Id",
    "X-User-Role",
    "X-Request-Id",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Request-Id"],
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

export const corsMiddleware = cors(corsOptions);
