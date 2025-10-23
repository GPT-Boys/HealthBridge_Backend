// =====================================================
// src/middleware/errorHandler.middleware.ts
// =====================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import ENV from '../config/env.js';

// Middleware para rutas no encontradas
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/records/patient/:patientId',
      'POST /api/records',
      'GET /api/records/:id',
      'PUT /api/records/:id',
      'DELETE /api/records/:id',
      'POST /api/records/:id/file',
      'GET /api/records/:id/files',
      'DELETE /api/files/:fileId',
      'POST /api/prescriptions',
      'GET /api/prescriptions/patient/:patientId',
      'GET /api/prescriptions/:id',
      'PUT /api/prescriptions/:id',
    ],
  });
};

// Middleware de manejo de errores global
export const errorHandler = (
  err: Error,
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
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    res.status(409).json({
      error: 'Recurso duplicado',
      details: 'Ya existe un registro con estos datos',
    });
    return;
  }

  // Error de CORS
  if (err.message === 'No permitido por CORS') {
    res.status(403).json({
      error: 'CORS: Origen no permitido',
    });
    return;
  }

  // Errores de multer (archivos)
  if (err.message.includes('Tipo de archivo no permitido')) {
    res.status(400).json({
      error: 'Tipo de archivo no permitido',
      details: err.message,
    });
    return;
  }

  if (err.message.includes('File too large')) {
    res.status(413).json({
      error: 'Archivo demasiado grande',
      details: 'El tamaño máximo permitido es 10MB',
    });
    return;
  }

  // Error genérico
  res.status(500).json({
    error: ENV.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    ...(ENV.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  });
};
