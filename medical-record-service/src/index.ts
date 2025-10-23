// =====================================================
// src/index.ts
// =====================================================

import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import medicalRecordRoutes from './routes/medicalRecord.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import { logger, logRequest } from './utils/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.middleware.js';
import ENV from './config/env.js';

// Crear aplicación Express
const app: Application = express();

// Configuración de CORS
const allowedOrigins = ENV.ALLOWED_ORIGINS.split(',');
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de seguridad
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(cors(corsOptions));
app.use(compression());
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (ENV.NODE_ENV === 'development' || ENV.NODE_ENV === 'test') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Custom request logging
app.use(logRequest);

// Rutas principales
app.use('/api/records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// Ruta raíz
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'HealthBridge Medical Record Service',
    version: '1.0.0',
    status: 'running',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
    }),
    endpoints: {
      records: '/api/records',
      patientRecords: '/api/records/patient/:patientId',
      prescriptions: '/api/prescriptions',
      health: '/health',
    },
  });
});

// Health check detallado
app.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    service: 'medical-record-service',
    status: 'OK',
    timestamp: new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
    }),
    uptime: process.uptime(),
    environment: ENV.NODE_ENV,
    database: {
      status: 'connected',
      name: 'MongoDB',
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  };

  res.json(healthCheck);
});

// API Info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'HealthBridge Medical Record Service',
    version: '1.0.0',
    description: 'Servicio de gestión de historiales médicos para la plataforma HealthBridge',
    features: [
      'Historial médico completo',
      'Signos vitales',
      'Diagnósticos (CIE-10)',
      'Prescripciones médicas',
      'Subida de archivos (rayos X, análisis)',
      'Gestión de laboratorios y estudios',
      'Seguimiento de tratamientos',
      'Control de acceso por roles',
    ],
    endpoints: {
      'POST /api/records': 'Crear registro médico',
      'GET /api/records/patient/:patientId': 'Obtener registros de paciente',
      'GET /api/records/patient/:patientId/stats': 'Estadísticas del paciente',
      'GET /api/records/:id': 'Obtener registro específico',
      'PUT /api/records/:id': 'Actualizar registro',
      'DELETE /api/records/:id': 'Eliminar registro (admin)',
      'POST /api/records/:recordId/file': 'Subir archivo',
      'GET /api/records/:recordId/files': 'Obtener archivos del registro',
      'GET /api/records/file/:fileId/download': 'Descargar archivo',
      'DELETE /api/records/file/:fileId': 'Eliminar archivo',
      'POST /api/prescriptions': 'Crear prescripción',
      'GET /api/prescriptions/patient/:patientId': 'Prescripciones del paciente',
      'GET /api/prescriptions/:id': 'Obtener prescripción',
      'PUT /api/prescriptions/:id': 'Actualizar prescripción',
      'POST /api/prescriptions/:id/cancel': 'Cancelar prescripción',
    },
  });
});

// Manejo de rutas no encontradas
app.use(notFound);

// Manejo global de errores
app.use(errorHandler);

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Iniciar servidor HTTP
    app.listen(ENV.PORT, () => {
      logger.info(
        `🚀 Servidor corriendo en puerto ${ENV.PORT} (${ENV.NODE_ENV})`
      );

      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📋 HealthBridge Medical Record Service              ║
║                                                       ║
║   Status:      ✅ Running                             ║
║   Environment: ${ENV.NODE_ENV.padEnd(12)}                   ║
║   Port:        ${ENV.PORT}                                    ║
║   URL:         http://localhost:${ENV.PORT}                  ║
║   Health:      http://localhost:${ENV.PORT}/health           ║
║   API Info:    http://localhost:${ENV.PORT}/api/info         ║
║                                                       ║
║   Time:        ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);

      if (ENV.NODE_ENV === 'development' || ENV.NODE_ENV === 'test') {
        logger.info('📋 Endpoints disponibles:');
        logger.info('   POST   /api/records');
        logger.info('   GET    /api/records/patient/:patientId');
        logger.info('   GET    /api/records/patient/:patientId/stats');
        logger.info('   GET    /api/records/:id');
        logger.info('   PUT    /api/records/:id');
        logger.info('   DELETE /api/records/:id');
        logger.info('   POST   /api/records/:recordId/file');
        logger.info('   GET    /api/records/:recordId/files');
        logger.info('   GET    /api/records/file/:fileId/download');
        logger.info('   DELETE /api/records/file/:fileId');
        logger.info('   POST   /api/prescriptions');
        logger.info('   GET    /api/prescriptions/patient/:patientId');
        logger.info('   GET    /api/prescriptions/:id');
        logger.info('   PUT    /api/prescriptions/:id');
        logger.info('   POST   /api/prescriptions/:id/cancel');
        logger.info('   GET    /health');
        logger.info('   GET    /api/info');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} recibido. Cerrando servidor gracefully...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de promesas no capturadas
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar
startServer();

export default app;
