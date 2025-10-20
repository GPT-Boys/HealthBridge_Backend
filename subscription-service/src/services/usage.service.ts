import { UsageTracking, type IUsageTracking } from "../models/UsageTracking.js";
import type { Document } from "mongoose";
import { PlanType, getPlanLimits } from "../utils/planLimits.js";
import { logger } from "../utils/logger.js";

export class UsageService {
  async initializeUsage(
    userId: string,
    planType: PlanType
  ): Promise<
    Document<unknown, {}, IUsageTracking, {}, {}> &
      IUsageTracking &
      Required<{ _id: unknown }> & { __v: number }
  > {
    try {
      const now = new Date();
      const limits = getPlanLimits(planType);

      const usage = new UsageTracking({
        userId,
        period: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        usage: {
          appointments: {
            count: 0,
            limit: limits.appointments.monthly,
          },
          storage: {
            usedMB: 0,
            limitMB: limits.storage.maxSizeMB,
          },
          apiCalls: {
            count: 0,
            limit: limits.features.apiAccess ? 10000 : 0,
          },
        },
      });

      await usage.save();
      logger.info(`Uso inicializado para usuario: ${userId}`);
      return usage;
    } catch (error: any) {
      logger.error("Error inicializando uso:", error);
      throw error;
    }
  }

  async getCurrentUsage(
    userId: string
  ): Promise<
    (Document<unknown, {}, IUsageTracking, {}, {}> & IUsageTracking) | null
  > {
    try {
      const now = new Date();
      let usage = await UsageTracking.findOne({
        userId,
        "period.month": now.getMonth() + 1,
        "period.year": now.getFullYear(),
      });

      // Si no existe, crear uno nuevo
      if (!usage) {
        const subscription = await import("./subscription.service.js").then(
          (m) => new m.SubscriptionService().getSubscription(userId)
        );
        if (subscription) {
          usage = await this.initializeUsage(
            userId,
            subscription.planType as PlanType
          );
        }
      }

      return usage;
    } catch (error: any) {
      logger.error("Error obteniendo uso actual:", error);
      throw error;
    }
  }

  async trackAppointment(userId: string): Promise<void> {
    try {
      const usage = await this.getCurrentUsage(userId);
      if (!usage) {
        throw new Error("No se encontró tracking de uso");
      }

      usage.usage.appointments.count += 1;
      usage.lastUpdated = new Date();
      await usage.save();

      logger.debug(`Cita registrada para usuario: ${userId}`);
    } catch (error: any) {
      logger.error("Error tracking cita:", error);
      throw error;
    }
  }

  async trackStorage(userId: string, sizeMB: number): Promise<void> {
    try {
      const usage = await this.getCurrentUsage(userId);
      if (!usage) {
        throw new Error("No se encontró tracking de uso");
      }

      usage.usage.storage.usedMB += sizeMB;
      usage.lastUpdated = new Date();
      await usage.save();

      logger.debug(`Storage actualizado para usuario: ${userId}, +${sizeMB}MB`);
    } catch (error: any) {
      logger.error("Error tracking storage:", error);
      throw error;
    }
  }

  async trackApiCall(userId: string): Promise<void> {
    try {
      const usage = await this.getCurrentUsage(userId);
      if (!usage) {
        throw new Error("No se encontró tracking de uso");
      }

      usage.usage.apiCalls.count += 1;
      usage.lastUpdated = new Date();
      await usage.save();
    } catch (error: any) {
      logger.error("Error tracking API call:", error);
      throw error;
    }
  }

  async checkLimit(
    userId: string,
    feature: "appointments" | "storage" | "apiCalls"
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    try {
      const usage = await this.getCurrentUsage(userId);
      if (!usage) {
        return { allowed: false, current: 0, limit: 0, remaining: 0 };
      }

      let current = 0;
      let limit = 0;

      if (feature === "storage") {
        // storage uses usedMB / limitMB
        current = usage.usage.storage.usedMB ?? 0;
        limit = usage.usage.storage.limitMB ?? 0;
      } else {
        // appointments and apiCalls use count / limit
        const u =
          feature === "appointments"
            ? usage.usage.appointments
            : usage.usage.apiCalls;
        current = u.count ?? 0;
        limit = u.limit ?? 0;
      }

      // -1 significa ilimitado
      if (limit === -1) {
        return { allowed: true, current, limit: -1, remaining: -1 };
      }

      const remaining = Math.max(0, limit - current);
      const allowed = current < limit;

      return { allowed, current, limit, remaining };
    } catch (error: any) {
      logger.error("Error verificando límite:", error);
      throw error;
    }
  }

  async resetMonthlyUsage(): Promise<void> {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Esto se ejecutaría con un cron job el día 1 de cada mes
      logger.info("Reseteando uso mensual...");

      // Aquí podrías archivar el uso del mes anterior si lo necesitas
      // Y luego inicializar el nuevo mes para cada usuario activo

      logger.info("Uso mensual reseteado");
    } catch (error: any) {
      logger.error("Error reseteando uso mensual:", error);
    }
  }
}
