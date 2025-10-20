import type { Request, Response } from "express";
import { Plan } from "../models/Plan.js";
import { logger } from "../utils/logger.js";
import { PLAN_LIMITS } from "../utils/planLimits.js";

export class PlanController {
  async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await Plan.find({ isActive: true });

      // Agregar límites detallados
      const plansWithLimits = plans.map((plan) => ({
        ...plan.toJSON(),
        detailedLimits: PLAN_LIMITS[plan.type as keyof typeof PLAN_LIMITS],
      }));

      res.json({ plans: plansWithLimits });
    } catch (error: any) {
      logger.error("Error obteniendo planes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getPlan(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      const plan = await Plan.findOne({ type, isActive: true });

      if (!plan) {
        res.status(404).json({ error: "Plan no encontrado" });
        return;
      }

      res.json({
        plan: {
          ...plan.toJSON(),
          detailedLimits: PLAN_LIMITS[plan.type as keyof typeof PLAN_LIMITS],
        },
      });
    } catch (error: any) {
      logger.error("Error obteniendo plan:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
