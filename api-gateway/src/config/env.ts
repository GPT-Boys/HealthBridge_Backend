import dotenv from "dotenv";
import path from "path";

const currentEnv = process.env.NODE_ENV || "development";

const envFileMap: Record<string, string> = {
  production: ".env.production",
  test: ".env.test",
  development: ".env.development",
};

const envFile = envFileMap[currentEnv] || ".env.development";
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

console.log(`✅ API Gateway - Entorno cargado: ${currentEnv} (${envFile})`);

const getEnv = (key: string, required = true, defaultValue = ""): string => {
  const value = process.env[key] ?? defaultValue;
  if (required && !value) {
    throw new Error(`❌ Falta la variable de entorno: ${key}`);
  }
  return value;
};

export const ENV = {
  NODE_ENV: currentEnv,
  PORT: Number(getEnv("PORT", false, "3000")),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", false, "7d"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", false, "30d"),

  FRONTEND_URL: getEnv("FRONTEND_URL", false, "http://localhost:5173"),
  ALLOWED_ORIGINS: getEnv("ALLOWED_ORIGINS", false, "http://localhost:5173,http://localhost:3000"),

  AUTH_SERVICE_URL: getEnv("AUTH_SERVICE_URL", false, "http://localhost:3001"),
  USER_SERVICE_URL: getEnv("USER_SERVICE_URL", false, "http://localhost:3002"),
  APPOINTMENT_SERVICE_URL: getEnv("APPOINTMENT_SERVICE_URL", false, "http://localhost:3003"),
  MEDICAL_RECORD_SERVICE_URL: getEnv("MEDICAL_RECORD_SERVICE_URL", false, "http://localhost:3004"),
  NOTIFICATION_SERVICE_URL: getEnv("NOTIFICATION_SERVICE_URL", false, "http://localhost:3005"),
  BILLING_SERVICE_URL: getEnv("BILLING_SERVICE_URL", false, "http://localhost:3006"),
  SUBSCRIPTION_SERVICE_URL: getEnv("SUBSCRIPTION_SERVICE_URL", false, "http://localhost:3007"),

  RATE_LIMIT_WINDOW_MS: Number(getEnv("RATE_LIMIT_WINDOW_MS", false, "900000")),
  RATE_LIMIT_MAX_REQUESTS: Number(getEnv("RATE_LIMIT_MAX_REQUESTS", false, "100")),

  LOG_LEVEL: getEnv("LOG_LEVEL", false, "info"),

  HEALTH_CHECK_INTERVAL: Number(getEnv("HEALTH_CHECK_INTERVAL", false, "30000")),

  PROXY_TIMEOUT: Number(getEnv("PROXY_TIMEOUT", false, "30000")),
  PROXY_CHANGE_ORIGIN: getEnv("PROXY_CHANGE_ORIGIN", false, "true") === "true",

  ENABLE_REQUEST_TRACKING: getEnv("ENABLE_REQUEST_TRACKING", false, "true") === "true",
};

export default ENV;
