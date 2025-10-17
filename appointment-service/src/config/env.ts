import dotenv from 'dotenv';

// Cargar configuración según el entorno
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${nodeEnv}` });

interface Config {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  
  // Servicios externos
  AUTH_SERVICE_URL: string;
  USER_SERVICE_URL: string;
  NOTIFICATION_SERVICE_URL: string;
  
  // Configuración de rate limiting
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Configuración de citas
  DEFAULT_APPOINTMENT_DURATION: number;
  MAX_APPOINTMENTS_PER_DAY: number;
  APPOINTMENT_REMINDER_HOURS: number[];
  
  // CORS
  ALLOWED_ORIGINS?: string;
  
  // Logging
  LOG_LEVEL: string;
}

const ENV: Config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3003', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthbridge_appointments',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  
  // Servicios
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Configuración de citas
  DEFAULT_APPOINTMENT_DURATION: parseInt(process.env.DEFAULT_APPOINTMENT_DURATION || '30', 10), // minutos
  MAX_APPOINTMENTS_PER_DAY: parseInt(process.env.MAX_APPOINTMENTS_PER_DAY || '20', 10),
    APPOINTMENT_REMINDER_HOURS: (process.env.APPOINTMENT_REMINDER_HOURS || '24,2').split(',').map((h: string) => parseInt(h, 10)),  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validaciones
if (!ENV.MONGODB_URI) {
  throw new Error('MONGODB_URI es requerido');
}

if (!ENV.JWT_SECRET || ENV.JWT_SECRET.length < 10) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}

export default ENV;