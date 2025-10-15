import { Request, Response, NextFunction } from "express";

/**
 * Middleware para autorizar acceso según roles de usuario.
 * Se debe usar junto con el middleware authenticate.
 *
 * Ejemplo de uso:
 * router.get("/admin", authenticate, authorize("admin"), handler);
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Verifica si existe usuario autenticado
      if (!req.user) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      // Verifica si su rol está permitido
      if (!roles.includes(req.user.role)) {
        res
          .status(403)
          .json({ error: "No tienes permisos para acceder a este recurso" });
        return;
      }

      // Si pasa ambas verificaciones, continúa al controlador
      next();
    } catch (error: unknown) {
      const err = error as any;
      console.error("Error en authorize middleware:", err.message);
      res.status(500).json({ error: "Error interno en autorización" });
    }
  };
};
