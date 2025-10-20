import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../utils/jwt.utils.js";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh-token",
  "/api/auth/verify-token",
  "/api/plans", // Public plans view
  "/health",
  "/metrics",
  "/",
];

const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (isPublicRoute(req.path)) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Token no proporcionado",
        message: "Se requiere autenticación para acceder a este recurso",
        requestId: req.requestId,
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      req.user = decoded;

      logger.debug("Token verificado", {
        requestId: req.requestId,
        userId: decoded.userId,
        role: decoded.role,
        path: req.path,
      });

      next();
    } catch (error) {
      logger.warn("Token inválido", {
        requestId: req.requestId,
        error: (error as Error).message,
        path: req.path,
        ip: req.ip,
      });

      res.status(401).json({
        error: "Token inválido o expirado",
        message: "Por favor inicia sesión nuevamente",
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.error("Error en middleware de autenticación:", {
      requestId: req.requestId,
      error,
    });
    res.status(500).json({
      error: "Error interno del servidor",
      message: "Error procesando la autenticación",
      requestId: req.requestId,
    });
  }
};

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Usuario no autenticado",
        requestId: req.requestId,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Acceso denegado por rol", {
        requestId: req.requestId,
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      res.status(403).json({
        error: "Acceso denegado",
        message: "No tienes permisos para acceder a este recurso",
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
};
