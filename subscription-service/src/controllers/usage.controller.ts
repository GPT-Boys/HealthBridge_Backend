import type { Request, Response } from "express";
import { UsageService } from "../services/usage.service.js";
import { logger } from "../utils/logger.js";

export class UsageController {
  private usageService: UsageService;

  constructor() {
    this.usageService = new UsageService();
  }

  async getCurrentUsage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const usage = await this.usageService.getCurrentUsage(userId);

      res.json({ usage });
    } catch (error: any) {
      logger.error("Error obteniendo uso:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async checkLimit(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { feature } = req.params;

      if (
        !feature ||
        !["appointments", "storage", "apiCalls"].includes(feature)
      ) {
        res.status(400).json({ error: "Feature inválido" });
        return;
      }

      const limitCheck = await this.usageService.checkLimit(
        userId,
        feature as "appointments" | "storage" | "apiCalls"
      );

      res.json(limitCheck);
    } catch (error: any) {
      logger.error("Error verificando límite:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async trackUsage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { type, value } = req.body;

      switch (type) {
        case "appointment":
          await this.usageService.trackAppointment(userId);
          break;
        case "storage":
          await this.usageService.trackStorage(userId, value);
          break;
        case "apiCall":
          await this.usageService.trackApiCall(userId);
          break;
        default:
          res.status(400).json({ error: "Tipo de uso inválido" });
          return;
      }

      res.json({ message: "Uso registrado exitosamente" });
    } catch (error: any) {
      logger.error("Error registrando uso:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
