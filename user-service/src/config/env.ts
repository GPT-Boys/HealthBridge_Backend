/**
 * Proyecto: HealthBridge - User Service
 * Archivo: env.ts
 * Descripción: Carga y valida las variables de entorno según el entorno actual.
 * Autor: Rodrigo Rivera
 * Fecha: 2025-10-09
 * Versión: 1.0
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

const envFile = envFileMap[currentEnv] || ".env.development";
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

console.log(`✅ Entorno cargado: ${currentEnv} (${envFile})`);

// ------------------------------------------------------------
// 3️⃣ Función para obtener variables de forma segura
// ------------------------------------------------------------
const getEnv = (key: string, required = true, defaultValue = ""): string => {
  const value = process.env[key] ?? defaultValue;
  if (required && !value) throw new Error(`❌ Falta la variable de entorno: ${key}`);
  return value;
};

// ------------------------------------------------------------
// 4️⃣ Exportar variables principales
// ------------------------------------------------------------
export const ENV = {
  NODE_ENV: currentEnv,
  PORT: Number(getEnv("PORT", false, "3002")),
  MONGODB_URI: getEnv("MONGODB_URI"),
  LOG_LEVEL: getEnv("LOG_LEVEL", false, "info"),
};

export default ENV;
