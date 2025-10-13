import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por IP
  message: "Demasiadas solicitudes desde esta IP",
});
app.use(limiter);

// Middleware de autenticación
const authMiddleware = (req: any, res: any, next: any) => {
  const publicRoutes = ["/api/auth/login", "/api/auth/register", "/api/health"];

  if (publicRoutes.some((route) => req.path.startsWith(route))) {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: `Token inválido. - ${error}` });
  }
};

app.use(authMiddleware);

// Configuración de microservicios
const services = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  user: process.env.USER_SERVICE_URL || "http://localhost:3002",
  appointment: process.env.APPOINTMENT_SERVICE_URL || "http://localhost:3003",
  medicalRecord:
    process.env.MEDICAL_RECORD_SERVICE_URL || "http://localhost:3004",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3005",
  billing: process.env.BILLING_SERVICE_URL || "http://localhost:3006",
};

// Proxies para cada microservicio
Object.entries(services).forEach(([serviceName, serviceUrl]) => {
  app.use(
    `/api/${serviceName}`,
    createProxyMiddleware({
      target: serviceUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/api/${serviceName}`]: "",
      },
      //   onProxyError: (err, req, res) => {
      //     console.error(`Proxy error for ${serviceName}:`, err);
      //     res.status(503).json({ error: `Servicio ${serviceName} no disponible` });
      //   }
    })
  );
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
  });
});

// Manejo de errores
app.use((err: any, req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway corriendo en puerto ${PORT}`);
  console.log(`📊 Health check disponible en http://localhost:${PORT}/health`);
});
