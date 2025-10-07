import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import appointmentRoutes from './routes/appointment.routes.js';
import { logger, logRequest } from './utils/logger.js';
import { ReminderService } from './services/reminder.service.js';
import ENV from './config/env.js';

// Crear aplicación Express
const app: Application = express();

// Configuración de CORS
const allowedOrigins = ENV.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
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
    error: 'Demasiadas solicitudes, intente nuevamente más tarde.',
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
  }),
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
    }),
  );
}

// Custom request logging
app.use(logRequest);

// Rutas principales
app.use('/api/appointments', appointmentRoutes);

// Ruta raíz
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'HealthBridge Appointment Service',
    version: '1.0.0',
    status: 'running',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
    }),
    endpoints: {
      appointments: '/api/appointments',
      availableSlots: '/api/appointments/slots/available',
      health: '/health',
      stats: '/api/appointments/stats'
    }
  });
});

// Health check detallado
app.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    service: 'appointment-service',
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
    services: {
      reminderService: 'active',
      notificationService: 'connected',
    },
  };

  res.json(healthCheck);
});

// API Info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'HealthBridge Appointment Service',
    version: '1.0.0',
    description: 'Servicio de gestión de citas médicas para la plataforma HealthBridge',
    features: [
      'Programación de citas médicas',
      'Gestión de horarios de doctores',
      'Recordatorios automáticos',
      'Citas virtuales y presenciales',
      'Sistema de cancelación y reagendamiento',
      'Validación de conflictos de horarios',
      'Notificaciones en tiempo real',
      'Estadísticas y reportes',
    ],
    endpoints: {
      'POST /api/appointments': 'Crear nueva cita',
      'GET /api/appointments': 'Listar citas con filtros',
      'GET /api/appointments/:id': 'Obtener cita por ID',
      'PUT /api/appointments/:id': 'Actualizar cita',
      'POST /api/appointments/:id/cancel': 'Cancelar cita',
      'POST /api/appointments/:id/reschedule': 'Reagendar cita',
      'POST /api/appointments/:id/confirm': 'Confirmar cita',
      'GET /api/appointments/slots/available': 'Obtener slots disponibles',
      'GET /api/appointments/stats': 'Obtener estadísticas',
    },
  });
});

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/info',
      'POST /api/appointments',
      'GET /api/appointments',
      'GET /api/appointments/slots/available',
    ],
  });
});

// Manejo global de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(err);
  }

  // Errores específicos
  if (err.message === 'No permitido por CORS') {
    res.status(403).json({ error: 'CORS: Origen no permitido' });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({ 
      error: 'Error de validación', 
      details: err.message 
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ 
      error: 'ID inválido' 
    });
    return;
  }

  res.status(500).json({
    error: ENV.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    ...((ENV.NODE_ENV === 'development' || ENV.NODE_ENV === 'test') && {
      stack: err.stack,
    }),
  });
});

// Inicializar servicio de recordatorios
const reminderService = new ReminderService();

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Iniciar servicio de recordatorios
    if (ENV.NODE_ENV !== 'test') {
      reminderService.start();
    }

    // Iniciar servidor HTTP
    app.listen(ENV.PORT, () => {
      logger.info(
        `🚀 Servidor corriendo en puerto ${ENV.PORT} (${ENV.NODE_ENV})`,
      );

      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📅 HealthBridge Appointment Service                 ║
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
        logger.info('   POST   /api/appointments');
        logger.info('   GET    /api/appointments');
        logger.info('   GET    /api/appointments/:id');
        logger.info('   PUT    /api/appointments/:id');
        logger.info('   POST   /api/appointments/:id/cancel');
        logger.info('   POST   /api/appointments/:id/reschedule');
        logger.info('   POST   /api/appointments/:id/confirm');
        logger.info('   GET    /api/appointments/slots/available');
        logger.info('   GET    /api/appointments/stats');
        logger.info('   GET    /health');
        logger.info('   GET    /api/info');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} recibido. Cerrando servidor gracefully...`);
      
      // Detener servicio de recordatorios
      reminderService.stop();
      
      // Cerrar conexiones de base de datos se maneja en database.ts
      
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
