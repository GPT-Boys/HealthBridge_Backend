import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import ENV from "../config/env.js";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Error no manejado:", {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  if (res.headersSent) {
    return next(err);
  }

  const isDevelopment = ENV.NODE_ENV === "development";

  res.status(500).json({
    error: isDevelopment ? err.message : "Error interno del servidor",
    message: "Ha ocurrido un error procesando tu solicitud",
    requestId: req.requestId,
    ...(isDevelopment && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn("Ruta no encontrada", {
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    message: "El endpoint solicitado no existe",
    requestId: req.requestId,
  });
};
