import dotenv from 'dotenv';
import { cleanEnv, str, num, url } from 'envalid';
import path from 'path';

// Cargar variables de entorno según el entorno
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const ENV = cleanEnv(process.env, {
  // Configuración del servidor
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: num({ default: 3006 }),
  
  // Base de datos
  MONGODB_URI: str({ default: 'mongodb://localhost:27017/healthbridge_billing' }),
  
  // JWT
  JWT_SECRET: str({ default: 'your-super-secret-jwt-key-change-in-production' }),
  
  // Stripe
  STRIPE_SECRET_KEY: str({ default: '' }),
  STRIPE_PUBLISHABLE_KEY: str({ default: '' }),
  STRIPE_WEBHOOK_SECRET: str({ default: '' }),
  
  // URLs de servicios
  AUTH_SERVICE_URL: url({ default: 'http://localhost:3001' }),
  USER_SERVICE_URL: url({ default: 'http://localhost:3002' }),
  APPOINTMENT_SERVICE_URL: url({ default: 'http://localhost:3003' }),
  NOTIFICATION_SERVICE_URL: url({ default: 'http://localhost:3005' }),
  SUBSCRIPTION_SERVICE_URL: url({ default: 'http://localhost:3007' }),
  
  // Rate limiting
  RATE_LIMIT_WINDOW: num({ default: 900000 }), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),
  
  // Configuración de facturación
  CURRENCY: str({ default: 'BOB' }),
  INVOICE_PREFIX: str({ default: 'INV' }),
  RECEIPT_PREFIX: str({ default: 'REC' }),
  
  // CORS
  ALLOWED_ORIGINS: str({ default: 'http://localhost:5173,http://localhost:3000,http://localhost:8080' }),
  
  // Logging
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'], default: 'info' }),
});

export default ENV;
