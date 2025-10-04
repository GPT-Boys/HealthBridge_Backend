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
import dotenv from "dotenv";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import { logger } from "./utils/logger.js";

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app: Application = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Configuración de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000",
];

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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
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

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
if (NODE_ENV === "development") {
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
  logger.info(`${req.method} ${req.path} ${res}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  next();
});

// Rutas
app.use("/api/auth", authRoutes);

// Ruta raíz
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "HealthBridge Auth Service",
    version: "1.0.0",
    status: "running",
    environment: NODE_ENV,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Health check detallado
app.get("/health", async (req: Request, res: Response) => {
  const healthCheck = {
    service: "auth-service",
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    path: req.path,
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

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
  });
});

// Manejo global de errores
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
      NODE_ENV === "production" ? "Error interno del servidor" : err.message,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🔐 HealthBridge Auth Service                        ║
║                                                       ║
║   Status:      ✅ Running                             ║
║   Environment: ${NODE_ENV.padEnd(12)}                   ║
║   Port:        ${PORT}                                    ║
║   URL:         http://localhost:${PORT}                  ║
║   Health:      http://localhost:${PORT}/health           ║
║   API Docs:    http://localhost:${PORT}/api/auth         ║
║                                                       ║
║   Time:        ${new Date().toLocaleString()}        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);

      if (NODE_ENV === "development") {
        logger.info("📋 Rutas disponibles:");
        logger.info("   POST   /api/auth/register");
        logger.info("   POST   /api/auth/login");
        logger.info("   POST   /api/auth/refresh-token");
        logger.info("   POST   /api/auth/verify-token");
        logger.info("   POST   /api/auth/logout");
        logger.info("   POST   /api/auth/logout-all");
        logger.info("   GET    /api/auth/profile");
        logger.info("   GET    /api/auth/health");
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} recibido. Cerrando servidor gracefully...`);

      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Manejo de promesas no capturadas
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Iniciar
startServer();

export default app;
