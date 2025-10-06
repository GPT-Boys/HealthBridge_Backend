/**
 * Proyecto: HealthBridge - Auth Service
 * Archivo: env.ts
 * Descripción: Carga y valida las variables de entorno según el entorno actual (local, test, producción)
 * Autor: Oscar Menacho Silva
 * Fecha: 2025-10-05
 * Versión: 1.2
 */

import dotenv from "dotenv";
import path from "path";

// ------------------------------------------------------------
// 1️⃣ Detectar entorno actual
// ------------------------------------------------------------
const currentEnv = process.env.NODE_ENV || "development";

// ------------------------------------------------------------
// 2️⃣ Determinar el archivo .env a cargar
// ------------------------------------------------------------
const envFileMap: Record<string, string> = {
  production: ".env.production",
  test: ".env.test",
  development: ".env.development",
};

// Fallback seguro
const envFile = envFileMap[currentEnv] || ".env.development";

// ------------------------------------------------------------
// 3️⃣ Cargar las variables de entorno
// ------------------------------------------------------------
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

console.log(`✅ Entorno cargado: ${currentEnv} (${envFile})`);

// ------------------------------------------------------------
// 4️⃣ Función de obtención segura
// ------------------------------------------------------------
const getEnv = (key: string, required = true, defaultValue = ""): string => {
  const value = process.env[key] ?? defaultValue;

  if (required && !value) {
    throw new Error(`❌ Falta la variable de entorno: ${key}`);
  }

  return value;
};

// ------------------------------------------------------------
// 5️⃣ Exportar variables principales de forma tipada
// ------------------------------------------------------------
export const ENV = {
  NODE_ENV: currentEnv,
  PORT: Number(getEnv("PORT", false, "3001")),

  MONGODB_URI: getEnv("MONGODB_URI"),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", false, "7d"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", false, "30d"),

  BCRYPT_ROUNDS: Number(getEnv("BCRYPT_ROUNDS", false, "10")),
  MAX_LOGIN_ATTEMPTS: Number(getEnv("MAX_LOGIN_ATTEMPTS", false, "5")),

  ALLOWED_ORIGINS: getEnv(
    "ALLOWED_ORIGINS",
    false,
    "http://localhost:5173,http://localhost:3000",
  ),
  LOG_LEVEL: getEnv("LOG_LEVEL", false, "info"),
};

export default ENV;
