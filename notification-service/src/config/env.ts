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

console.log(`✅ Notification Service - Entorno: ${currentEnv} (${envFile})`);

const getEnv = (key: string, required = true, defaultValue = ""): string => {
  const value = process.env[key] ?? defaultValue;
  if (required && !value) {
    throw new Error(`❌ Falta la variable de entorno: ${key}`);
  }
  return value;
};

export const ENV = {
  NODE_ENV: currentEnv,
  PORT: Number(getEnv("PORT", false, "3005")),

  // Base de datos
  MONGODB_URI: getEnv("MONGODB_URI"),

  // Mensajería
  RABBITMQ_URL: getEnv("RABBITMQ_URL", false, "amqp://localhost"),

  // Email
  EMAIL_USER: getEnv("EMAIL_USER", false, ""),
  EMAIL_PASSWORD: getEnv("EMAIL_PASSWORD", false, ""),
  EMAIL_FROM: getEnv("EMAIL_FROM", false, "noreply@healthbridge.com"),

  // Twilio (SMS)
  TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID", false, ""),
  TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN", false, ""),
  TWILIO_PHONE_NUMBER: getEnv("TWILIO_PHONE_NUMBER", false, ""),

  // Seguridad interna
  INTERNAL_API_KEY: getEnv("INTERNAL_API_KEY", false, "internal-secret-key-dev"),

  LOG_LEVEL: getEnv("LOG_LEVEL", false, "info"),
};

export default ENV;
