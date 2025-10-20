import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import ENV from './config/env.js';

// Importar rutas
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { paymentController } from './controllers/payment.controller.js';
import reportRoutes from './routes/report.routes.js';

const app: Application = express();

// Configuración de seguridad
app.use(helmet());

// CORS
const allowedOrigins = ENV.ALLOWED_ORIGINS.split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
}));

// Compresión de respuestas
app.use(compression());

// Body parsers
// NOTA: Stripe Webhook requiere raw body, se agrega ruta especial antes del json middleware
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook.bind(paymentController));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Billing Service está funcionando correctamente',
    timestamp: new Date().toISOString(),
    service: 'billing-service',
    version: '1.0.0',
  });
});

// Rutas API
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Ruta de bienvenida
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: '🏥 HealthBridge Billing Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      invoices: '/api/invoices',
      payments: '/api/payments',
      reports: '/api/reports',
    },
  });
});

// Middleware para rutas no encontradas
app.use(notFound);

// Middleware de manejo de errores
app.use(errorHandler);

// Iniciar servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Iniciar servidor
    const PORT = ENV.PORT || 3006;
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🏥 HealthBridge Billing Service`);
      logger.info(`📡 Servidor ejecutándose en puerto ${PORT}`);
      logger.info(`🌍 Entorno: ${ENV.NODE_ENV}`);
      logger.info(`💳 Moneda: ${ENV.CURRENCY}`);
      logger.info('='.repeat(50));
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM recibido, cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT recibido, cerrando servidor gracefully...');
  process.exit(0);
});

// Manejo de promesas rechazadas no capturadas
process.on('unhandledRejection', (reason: any) => {
  logger.error('❌ Unhandled Rejection:', reason);
});

// Iniciar el servidor
startServer();

export default app;
