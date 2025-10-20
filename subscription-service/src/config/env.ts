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

console.log(`✅ Subscription Service - Entorno: ${currentEnv} (${envFile})`);

const getEnv = (key: string, required = true, defaultValue = ""): string => {
  const value = process.env[key] ?? defaultValue;
  if (required && !value) {
    throw new Error(`❌ Falta la variable de entorno: ${key}`);
  }
  return value;
};

export const ENV = {
  NODE_ENV: currentEnv,
  PORT: Number(getEnv("PORT", false, "3007")),

  MONGODB_URI: getEnv("MONGODB_URI"),

  JWT_SECRET: getEnv("JWT_SECRET"),

  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PUBLISHABLE_KEY: getEnv("STRIPE_PUBLISHABLE_KEY", false, ""),

  FRONTEND_URL: getEnv("FRONTEND_URL", false, "http://localhost:5173"),
  ALLOWED_ORIGINS: getEnv(
    "ALLOWED_ORIGINS",
    false,
    "http://localhost:5173,http://localhost:3000"
  ),

  LOG_LEVEL: getEnv("LOG_LEVEL", false, "info"),

  // Plan prices in Bolivianos (Bs.)
  BASIC_PRICE: 0,
  PREMIUM_PRICE: Number(getEnv("PREMIUM_PRICE", false, "50")),
  ENTERPRISE_PRICE: Number(getEnv("ENTERPRISE_PRICE", false, "120")),
};

export default ENV;
