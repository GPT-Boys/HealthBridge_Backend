import type { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscription.service.js";
import { UsageService } from "../services/usage.service.js";
import { logger } from "../utils/logger.js";
import { getPlanLimits, PlanType } from "../utils/planLimits.js";

const subscriptionService = new SubscriptionService();
const usageService = new UsageService();

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    const subscription = await subscriptionService.getSubscription(userId);

    if (!subscription || !subscription.isActive()) {
      res.status(403).json({
        error: "Suscripción inactiva",
        message: "Tu suscripción ha expirado. Por favor renueva tu plan.",
      });
      return;
    }

    // Agregar info de suscripción al request
    (req as any).subscription = subscription;
    next();
  } catch (error: any) {
    logger.error("Error verificando suscripción:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const checkFeature = (feature: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscription = (req as any).subscription;

      if (!subscription) {
        res.status(403).json({ error: "Suscripción no encontrada" });
        return;
      }

      const limits = getPlanLimits(subscription.planType as PlanType);

      // Navegar features anidados
      const getNestedValue = (obj: any, path: string): any => {
        return path.split(".").reduce((current, key) => current?.[key], obj);
      };

      const hasFeature = getNestedValue(limits.features, feature);

      if (!hasFeature) {
        res.status(403).json({
          error: "Funcionalidad no disponible",
          message: `Esta funcionalidad requiere un plan superior. Plan actual: ${subscription.planType}`,
          requiredPlan: "premium o enterprise",
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error("Error verificando feature:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
};

export const checkLimit = (
  limitType: "appointments" | "storage" | "apiCalls"
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const limitCheck = await usageService.checkLimit(userId, limitType);

      if (!limitCheck.allowed) {
        res.status(403).json({
          error: "Límite alcanzado",
          message: `Has alcanzado el límite de ${limitType} para tu plan`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeUrl: "/subscription/upgrade",
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error("Error verificando límite:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
};
