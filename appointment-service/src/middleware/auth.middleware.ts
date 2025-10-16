import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ENV from '../config/env.js';
import { logger } from '../utils/logger.js';

// Extender la interfaz de Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: 'admin' | 'doctor' | 'patient';
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  iat?: number;
  exp?: number;
}

/**
 * Middleware de autenticación JWT
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ 
        error: 'Token de acceso requerido' 
      });
      return;
    }

    jwt.verify(token, ENV.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Token inválido intentado:', { 
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          error: err.message 
        });
        
        res.status(403).json({ 
          error: 'Token inválido o expirado' 
        });
        return;
      }

      const payload = decoded as JWTPayload;
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      next();
    });
  } catch (error) {
    logger.error('Error en autenticación:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Middleware para autorizar roles específicos
 */
export const authorizeRoles = (...roles: Array<'admin' | 'doctor' | 'patient'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Acceso no autorizado intentado:', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });

      res.status(403).json({ 
        error: 'No tiene permisos para acceder a este recurso' 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware para verificar si el usuario puede acceder a una cita específica
 */
export const authorizeAppointmentAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Usuario no autenticado' 
    });
    return;
  }

  // Los administradores tienen acceso completo
  if (req.user.role === 'admin') {
    return next();
  }

  // Para otros roles, verificar en base a los parámetros de la consulta o el cuerpo
  const { patientId, doctorId } = req.query;
  const bodyPatientId = req.body?.patientId;
  const bodyDoctorId = req.body?.doctorId;

  // Los doctores solo pueden ver sus propias citas
  if (req.user.role === 'doctor') {
    const requestedDoctorId = doctorId || bodyDoctorId;
    
    if (requestedDoctorId && requestedDoctorId !== req.user.userId) {
      res.status(403).json({ 
        error: 'Solo puede acceder a sus propias citas' 
      });
      return;
    }
  }

  // Los pacientes solo pueden ver sus propias citas
  if (req.user.role === 'patient') {
    const requestedPatientId = patientId || bodyPatientId;
    
    if (requestedPatientId && requestedPatientId !== req.user.userId) {
      res.status(403).json({ 
        error: 'Solo puede acceder a sus propias citas' 
      });
      return;
    }
    
    // Los pacientes no pueden especificar doctorId en filtros
    if (doctorId || bodyDoctorId) {
      delete req.query.doctorId;
      delete req.body.doctorId;
    }
  }

  next();
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, ENV.JWT_SECRET, (err: any, decoded: any) => {
      if (!err && decoded) {
        const payload = decoded as JWTPayload;
        req.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        };
      }
      
      next();
    });
  } catch (error) {
    // Ignorar errores en autenticación opcional
    next();
  }
};