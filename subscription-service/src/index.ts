import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cron from "node-cron";
import { connectDatabase } from "./config/database.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import planRoutes from "./routes/plan.routes.js";
import usageRoutes from "./routes/usage.routes.js";
import { logger } from "./utils/logger.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { Plan } from "./models/Plan.js";
import ENV from "./config/env.js";
import { PLAN_LIMITS } from "./utils/planLimits.js";

const app: Application = express();

// CORS
const allowedOrigins = ENV.ALLOWED_ORIGINS.split(",");
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware de seguridad
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// Body parser - IMPORTANTE: raw body para webhooks de Stripe
app.use("/api/subscription/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, {
      ip: req.ip,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Rutas
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/usage", usageRoutes);

// Ruta raíz
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "HealthBridge Subscription Service",
    version: "1.0.0",
    status: "running",
    environment: ENV.NODE_ENV,
    model: "Freemium",
    plans: ["basic", "premium", "enterprise"],
    timestamp: new Date().toLocaleString("es-BO", {
      timeZone: "America/La_Paz",
    }),
  });
});

// Health check
app.get("/health", async (req: Request, res: Response) => {
  const healthCheck = {
    service: "subscription-service",
    status: "OK",
    timestamp: new Date().toLocaleString("es-BO", {
      timeZone: "America/La_Paz",
    }),
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
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Error no manejado:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error:
      ENV.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err.message,
    ...(ENV.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Inicializar planes por defecto
const initializePlans = async () => {
  try {
    const plansCount = await Plan.countDocuments();

    if (plansCount === 0) {
      logger.info("Inicializando planes por defecto...");

      const plans = [
        {
          name: "Plan Básico",
          type: "basic",
          price: ENV.BASIC_PRICE,
          currency: "BOB",
          features: [
            "2 citas por mes",
            "100MB de almacenamiento",
            "Historial médico básico",
            "Soporte por email",
          ],
          limits: {
            appointments: PLAN_LIMITS.basic.appointments.monthly,
            storage: PLAN_LIMITS.basic.storage.maxSizeMB,
            filesPerRecord: PLAN_LIMITS.basic.storage.filesPerRecord,
          },
        },
        {
          name: "Plan Premium",
          type: "premium",
          price: ENV.PREMIUM_PRICE,
          currency: "BOB",
          features: [
            "10 citas por mes",
            "500MB de almacenamiento",
            "Teleconsultas",
            "Recordatorios SMS",
            "Soporte prioritario",
            "Exportar PDF",
          ],
          limits: {
            appointments: PLAN_LIMITS.premium.appointments.monthly,
            storage: PLAN_LIMITS.premium.storage.maxSizeMB,
            filesPerRecord: PLAN_LIMITS.premium.storage.filesPerRecord,
          },
        },
        {
          name: "Plan Enterprise",
          type: "enterprise",
          price: ENV.ENTERPRISE_PRICE,
          currency: "BOB",
          features: [
            "Citas ilimitadas",
            "Almacenamiento ilimitado",
            "Teleconsultas premium",
            "API completa",
            "Multi-clínica",
            "Soporte 24/7",
            "Reportes avanzados",
            "Branding personalizado",
          ],
          limits: {
            appointments: -1,
            storage: -1,
            filesPerRecord: -1,
          },
        },
      ];

      await Plan.insertMany(plans);
      logger.info("✅ Planes inicializados correctamente");
    }
  } catch (error) {
    logger.error("Error inicializando planes:", error);
  }
};

// Cron jobs
const setupCronJobs = () => {
  const subscriptionService = new SubscriptionService();

  // Verificar suscripciones expiradas cada hora
  cron.schedule("0 * * * *", async () => {
    logger.info("Ejecutando verificación de suscripciones expiradas...");
    await subscriptionService.checkAndUpdateExpiredSubscriptions();
  });

  logger.info("✅ Cron jobs configurados");
};

// Iniciar servidor
const startServer = async () => {
  try {
    await connectDatabase();
    await initializePlans();
    setupCronJobs();

    app.listen(ENV.PORT, () => {
      logger.info(
        `🚀 Subscription Service corriendo en puerto ${ENV.PORT} (${ENV.NODE_ENV})`
      );

      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   💳 HealthBridge Subscription Service                ║
║                                                       ║
║   Status:      ✅ Running                             ║
║   Environment: ${ENV.NODE_ENV.padEnd(12)}                   ║
║   Port:        ${ENV.PORT}                                    ║
║   URL:         http://localhost:${ENV.PORT}                  ║
║   Health:      http://localhost:${ENV.PORT}/health           ║
║   Model:       Freemium (Basic/Premium/Enterprise)    ║
║                                                       ║
║   Time:        ${new Date().toLocaleString("es-BO", {
        timeZone: "America/La_Paz",
      })}        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);

      if (ENV.NODE_ENV === "development") {
        logger.info("📋 Rutas disponibles:");
        logger.info("   GET    /api/plans");
        logger.info("   GET    /api/subscription/my-subscription");
        logger.info("   POST   /api/subscription");
        logger.info("   POST   /api/subscription/upgrade");
        logger.info("   POST   /api/subscription/downgrade");
        logger.info("   POST   /api/subscription/cancel");
        logger.info("   GET    /api/usage/current");
        logger.info("   GET    /api/usage/check/:feature");
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} recibido. Cerrando servidor...`);
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();

export default app;
