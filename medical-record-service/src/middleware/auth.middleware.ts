// =====================================================
// src/middleware/auth.middleware.ts
// =====================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ENV from '../config/env.js';
import { logger } from '../utils/logger.js';

// Extender Request para incluir información del usuario
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No se proporcionó token de autenticación',
      });
      return;
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar token
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

    // Agregar información del usuario al request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug('Usuario autenticado:', {
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error: any) {
    logger.error('Error en autenticación:', error);

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expirado',
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Token inválido',
      });
      return;
    }

    res.status(401).json({
      error: 'Error de autenticación',
    });
  }
};

// Middleware para verificar roles
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'No autenticado',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Acceso denegado:', {
        userId: req.user.id,
        role: req.user.role,
        required: allowedRoles,
      });

      res.status(403).json({
        error: 'No tiene permisos para acceder a este recurso',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

// Middleware para verificar acceso a registros del paciente
export const checkPatientAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.params;
    const user = req.user!;

    // Admin y doctores pueden acceder a cualquier registro
    if (user.role === 'admin' || user.role === 'doctor') {
      next();
      return;
    }

    // Pacientes solo pueden acceder a sus propios registros
    if (user.role === 'patient' && user.id === patientId) {
      next();
      return;
    }

    logger.warn('Intento de acceso no autorizado a registros:', {
      userId: user.id,
      role: user.role,
      requestedPatientId: patientId,
    });

    res.status(403).json({
      error: 'No tiene permisos para acceder a estos registros médicos',
    });
  } catch (error) {
    logger.error('Error verificando acceso:', error);
    res.status(500).json({
      error: 'Error verificando permisos',
    });
  }
};
