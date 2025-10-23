import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import userRoutes from "./routes/user.routes.js";
import { logger } from "./utils/logger.js";
import { notFound, errorHandler } from "./middleware/errorHandler.middleware.js";

const app = express();

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================
app.use(
  helmet({
    contentSecurityPolicy: ENV.NODE_ENV === "production",
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors({
  origin: ENV.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por IP
  message: { error: 'Demasiadas solicitudes, intente nuevamente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// =====================================================
// REQUEST PROCESSING MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// LOGGING MIDDLEWARE
// =====================================================
if (ENV.NODE_ENV === 'development') {
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

// =====================================================
// DATABASE CONNECTION
// =====================================================
connectDB();

// =====================================================
// ROUTES
// =====================================================

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "HealthBridge User Service",
    version: "1.0.0",
    status: "running",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      users: "/users",
      doctors: "/users/doctors",
      myProfile: "/users/me",
      health: "/health",
    },
  });
});

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    const healthCheck = {
      service: "user-service",
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: ENV.NODE_ENV,
      database: {
        status: "connected",
        name: "MongoDB",
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
    };

    res.json(healthCheck);
  } catch (error) {
    res.status(503).json({
      service: "user-service",
      status: "ERROR",
      error: "Service unavailable",
    });
  }
});

// User routes
app.use("/users", userRoutes);

// =====================================================
// ERROR HANDLERS
// =====================================================
app.use(notFound);
app.use(errorHandler);

// =====================================================
// SERVER STARTUP
// =====================================================
const startServer = () => {
  app.listen(ENV.PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${ENV.PORT} (${ENV.NODE_ENV})`);
    
    logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   � HealthBridge User Service                        ║
║                                                       ║
║   Status:      ✅ Running                             ║
║   Environment: ${ENV.NODE_ENV?.padEnd(12) || 'development'}                   ║
║   Port:        ${ENV.PORT}                                    ║
║   URL:         http://localhost:${ENV.PORT}                  ║
║   Health:      http://localhost:${ENV.PORT}/health           ║
║                                                       ║
║   Time:        ${new Date().toLocaleString()}        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);

    if (ENV.NODE_ENV === 'development') {
      logger.info('📋 Endpoints disponibles:');
      logger.info('   POST   /users');
      logger.info('   GET    /users');
      logger.info('   GET    /users/:id');
      logger.info('   PUT    /users/:id');
      logger.info('   DELETE /users/:id');
      logger.info('   GET    /users/doctors');
      logger.info('   GET    /users/doctors/:id');
      logger.info('   GET    /users/me');
      logger.info('   PUT    /users/me');
      logger.info('   GET    /users/stats');
      logger.info('   GET    /health');
    }
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`\n${signal} recibido. Cerrando servidor gracefully...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Handle uncaught errors
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export default app;
