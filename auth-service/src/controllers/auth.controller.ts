import { type Request, type Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { logger } from "../utils/logger.js";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, role, profile } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
        profile,
      });

      res.status(201).json({
        message: "Usuario registrado exitosamente",
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          profile: result.user.profile,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      logger.error("Error en registro:", error);

      if (error.message === "El usuario ya existe") {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers["user-agent"];

      const result = await authService.login({ email, password }, userAgent);

      res.json({
        message: "Login exitoso",
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          profile: result.user.profile,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      logger.error("Error en login:", error);

      if (error.message.includes("Credenciales inválidas")) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      if (error.message.includes("Cuenta bloqueada")) {
        res.status(423).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: "Refresh token requerido" });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        message: "Token renovado exitosamente",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      logger.error("Error renovando token:", error);
      res.status(401).json({ error: "Refresh token inválido o expirado" });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        res.status(401).json({ error: "Token requerido" });
        return;
      }

      const user = await authService.verifyToken(token);

      res.json({
        valid: true,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profile: user.profile,
        },
      });
    } catch (error: any) {
      logger.error("Error verificando token:", error);
      res.status(401).json({ error: "Token inválido" });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;

      if (!userId || !refreshToken) {
        res.status(400).json({ error: "Usuario y refresh token requeridos" });
        return;
      }

      await authService.logout(userId, refreshToken);

      res.json({ message: "Logout exitoso" });
    } catch (error: any) {
      logger.error("Error en logout:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(400).json({ error: "Usuario requerido" });
        return;
      }

      await authService.logoutAll(userId);

      res.json({ message: "Logout de todos los dispositivos exitoso" });
    } catch (error: any) {
      logger.error("Error en logout all:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const user = await authService.verifyToken("");

      res.json({
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profile: user.profile,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      logger.error("Error obteniendo perfil:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
