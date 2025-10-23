// =====================================================
// src/middleware/errorHandler.middleware.ts
// =====================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { ENV } from '../config/env.js';

// Middleware para rutas no encontradas
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /users',
      'GET /users/:id',
      'POST /users',
      'PUT /users/:id',
      'DELETE /users/:id',
      'GET /doctors',
      'GET /doctors/:id',
      'GET /me',
      'PUT /me',
    ],
  });
};

// Middleware de manejo de errores global
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Si ya se envió la respuesta, delegar al handler por defecto
  if (res.headersSent) {
    return next(err);
  }

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Error de validación',
      details: err.message,
    });
    return;
  }

  // Errores de cast de Mongoose (ID inválido)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: 'ID inválido',
      details: err.message,
    });
    return;
  }

  // Errores de duplicados de Mongoose
  if (err.name === 'MongoServerError' && err.code === 11000) {
    res.status(409).json({
      error: 'Recurso duplicado',
      details: 'Ya existe un usuario con estos datos',
    });
    return;
  }

  // Error genérico
  res.status(err.status || 500).json({
    error: ENV.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    ...(ENV.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  });
};
