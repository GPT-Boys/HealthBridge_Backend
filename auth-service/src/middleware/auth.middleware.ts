import { type Request, type Response, type NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../utils/jwt.utils.js";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token no proporcionado" });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.error("Error verificando token:", error);
      res.status(401).json({ error: "Token inválido o expirado" });
    }
  } catch (error) {
    logger.error("Error en middleware de autenticación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ error: "No tienes permisos para acceder a este recurso" });
      return;
    }

    next();
  };
};
