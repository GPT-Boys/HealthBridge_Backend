import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";
import ENV from "../config/env.js";

export const generalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: "Demasiadas solicitudes desde esta IP",
    message: "Por favor intenta nuevamente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      requestId: req.requestId,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      error: "Demasiadas solicitudes",
      message: "Has excedido el límite de solicitudes. Intenta nuevamente más tarde.",
      retryAfter: Math.ceil(ENV.RATE_LIMIT_WINDOW_MS / 1000),
      requestId: req.requestId,
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    error: "Demasiados intentos de autenticación",
    message: "Por favor intenta nuevamente en 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 requests
  skipSuccessfulRequests: false,
  message: {
    error: "Demasiadas solicitudes en poco tiempo",
    message: "Por favor espera un minuto antes de intentar nuevamente",
  },
});
