// =====================================================
// src/index.ts
// =====================================================

import express, { type Application, type Request, type Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import compression from "compression";
import axios from "axios";
import { logger } from "./utils/logger.js";
import { HealthChecker } from "./utils/healthCheck.js";
import { requestTracker } from "./utils/requestTracker.js";
import { services } from "./config/services.config.js";
import { createProxyOptions } from "./config/proxy.config.js";
import { corsMiddleware } from "./middleware/cors.middleware.js";
import { morganMiddleware, requestLogger } from "./middleware/logger.middleware.js";
import { generalLimiter, authLimiter } from "./middleware/rateLimit.middleware.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";
import ENV from "./config/env.js";

const app: Application = express();

// Initialize services map for health checker
const servicesMap: { [key: string]: string } = {};
services.forEach((service) => {
  servicesMap[service.name] = service.url;
});
const healthChecker = new HealthChecker(servicesMap);

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================
app.use(
  helmet({
    contentSecurityPolicy: ENV.NODE_ENV === "production" ? true : false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(corsMiddleware);
app.use(compression());

// =====================================================
// REQUEST PROCESSING MIDDLEWARE
// =====================================================
app.use(requestTracker);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =====================================================
// LOGGING MIDDLEWARE
// =====================================================
app.use(morganMiddleware);
app.use(requestLogger);

// =====================================================
// RATE LIMITING MIDDLEWARE
// =====================================================
app.use(generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================
app.use(authMiddleware);

// =====================================================
// API GATEWAY ROUTES
// =====================================================

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "HealthBridge API Gateway",
    version: "1.0.0",
    status: "running",
    environment: ENV.NODE_ENV,
    timestamp: new Date().toLocaleString("en-US", {
      timeZone: "America/La_Paz",
    }),
    documentation: "/api/docs",
    health: "/health",
    metrics: "/metrics",
    requestId: req.requestId,
  });
});

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    const servicesHealth = await healthChecker.checkAllServices();
    const overallHealth = healthChecker.getOverallHealth();

    const healthData = {
      api_gateway: {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toLocaleString("en-US", {
          timeZone: "America/La_Paz",
        }),
        environment: ENV.NODE_ENV,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB",
        },
        cpu: process.cpuUsage(),
      },
      services: Object.fromEntries(servicesHealth),
      overall: overallHealth,
      requestId: req.requestId,
    };

    const statusCode = overallHealth === "healthy" ? 200 : overallHealth === "degraded" ? 207 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error("Error en health check:", { requestId: req.requestId, error });
    res.status(500).json({
      api_gateway: {
        status: "unhealthy",
        error: "Error checking services health",
      },
      requestId: req.requestId,
    });
  }
});

// Metrics endpoint
app.get("/metrics", (req: Request, res: Response) => {
  const metrics = {
    api_gateway: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: ENV.NODE_ENV,
    },
    services: Object.fromEntries(healthChecker.getHealthStatus()),
    timestamp: new Date().toLocaleString("en-US", {
      timeZone: "America/La_Paz",
    }),
    requestId: req.requestId,
  };

  res.json(metrics);
});

// Services info endpoint
app.get("/services", (req: Request, res: Response) => {
  const servicesInfo = services.map((service) => ({
    name: service.name,
    path: service.path,
    description: service.description,
    requiresAuth: service.requiresAuth,
  }));

  res.json({
    services: servicesInfo,
    total: servicesInfo.length,
    requestId: req.requestId,
  });
});

// =====================================================
// DIRECT AUTH ROUTES (bypass proxy for testing)
// =====================================================

// Helper function para manejar requests directos al auth service
const handleAuthRequest = async (req: Request, res: Response, endpoint: string) => {
  try {
    logger.info(`Direct ${endpoint} request`, {
      requestId: req.requestId,
      body: req.body,
    });

    const response = await axios.post(`${ENV.AUTH_SERVICE_URL}/api/auth/${endpoint}`, req.body, {
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": req.requestId,
      },
      timeout: 10000,
    });

    logger.info(`Direct ${endpoint} response`, {
      requestId: req.requestId,
      status: response.status,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    logger.error(`Direct ${endpoint} error`, {
      requestId: req.requestId,
      error: error.message,
    });

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Error interno del servidor",
        message: `Error procesando la solicitud de ${endpoint}`,
        requestId: req.requestId,
      });
    }
  }
};

// Rutas directas para todos los endpoints POST del auth service
app.post("/api/auth/login", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "login");
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "register");
});

app.post("/api/auth/refresh-token", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "refresh-token");
});

app.post("/api/auth/verify-token", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "verify-token");
});

app.post("/api/auth/logout", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "logout");
});

app.post("/api/auth/logout-all", async (req: Request, res: Response) => {
  await handleAuthRequest(req, res, "logout-all");
});

// =====================================================
// CONFIGURE PROXIES FOR EACH MICROSERVICE
// =====================================================
services.forEach((service) => {
  const proxyOptions = createProxyOptions(service.url, /*service.path,*/ service.timeout);
  // const proxyOptions = createProxyOptions(service.url, service.path, service.timeout);

  logger.info(`Configurando proxy para ${service.name}`, {
    path: service.path,
    target: service.url,
    timeout: service.timeout,
    requiresAuth: service.requiresAuth,
  });

  app.use(service.path, createProxyMiddleware(proxyOptions));

  logger.info(`Proxy configurado para ${service.name}_service -> ${service.url}`);
});

// =====================================================
// ERROR HANDLERS
// =====================================================
app.use(notFoundHandler);
app.use(errorHandler);

// =====================================================
// SERVER STARTUP
// =====================================================
const startServer = async () => {
  try {
    app.listen(ENV.PORT, () => {
      logger.info(`🚀 API Gateway corriendo en puerto ${ENV.PORT} (${ENV.NODE_ENV})`);

      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚪 HealthBridge API Gateway                         ║
║                                                       ║
║   Status:      ✅ Running                             ║
║   Environment: ${ENV.NODE_ENV.padEnd(12)}                   ║
║   Port:        ${ENV.PORT}                                    ║
║   URL:         http://localhost:${ENV.PORT}                  ║
║   Health:      http://localhost:${ENV.PORT}/health           ║
║   Metrics:     http://localhost:${ENV.PORT}/metrics          ║
║   Services:    http://localhost:${ENV.PORT}/services         ║
║                                                       ║
║   Time:        ${new Date().toLocaleString("es-ES", { timeZone: "America/La_Paz" })}        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);

      if (ENV.NODE_ENV === "development") {
        logger.info("📋 Servicios configurados:");
        services.forEach((service) => {
          logger.info(
            `   ${service.path.padEnd(25)} -> ${service.url.padEnd(35)} (${service.name})`
          );
        });
      }
    });

    // Start health checks
    healthChecker.startPeriodicChecks(ENV.HEALTH_CHECK_INTERVAL);

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} recibido. Cerrando API Gateway gracefully...`);
      healthChecker.stopPeriodicChecks();
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Error al iniciar el API Gateway:", error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();

export default app;
