import { Subscription, type ISubscription } from "../models/Subscription.js";
import { Plan } from "../models/Plan.js";
import { UsageService } from "./usage.service.js";
import { StripeService } from "./stripe.service.js";
import { logger } from "../utils/logger.js";
import { PlanType } from "../utils/planLimits.js";

export class SubscriptionService {
  private usageService: UsageService;
  private stripeService: StripeService;

  constructor() {
    this.usageService = new UsageService();
    this.stripeService = new StripeService();
  }

  async createSubscription(
    userId: string,
    planType: PlanType,
    paymentMethod: string = "stripe"
  ): Promise<ISubscription> {
    try {
      // Verificar si ya tiene suscripción activa
      const existing = await Subscription.findOne({
        userId,
        status: { $in: ["active", "trial"] },
      });

      if (existing) {
        throw new Error("El usuario ya tiene una suscripción activa");
      }

      // Obtener detalles del plan
      const plan = await Plan.findOne({ type: planType, isActive: true });
      if (!plan) {
        throw new Error("Plan no encontrado");
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 mes

      // Si es basic, no necesita pago
      if (planType === PlanType.BASIC) {
        const subscription = new Subscription({
          userId,
          planType,
          status: "active",
          startDate,
          endDate: new Date("2099-12-31"), // Básico nunca expira
          autoRenew: false,
          paymentMethod: "none",
        });

        await subscription.save();

        // Inicializar tracking de uso
        await this.usageService.initializeUsage(userId, planType);

        logger.info(`Suscripción BASIC creada para usuario: ${userId}`);
        return subscription;
      }

      // Para planes pagos, manejar con Stripe
      if (paymentMethod === "stripe") {
        const stripeData = await this.stripeService.createSubscription(
          userId,
          plan.stripePriceId!
        );

        const subscription = new Subscription({
          userId,
          planType,
          status: "active",
          startDate,
          endDate,
          autoRenew: true,
          paymentMethod: "stripe",
          stripeCustomerId: stripeData.customerId,
          stripeSubscriptionId: stripeData.subscriptionId,
          nextPaymentDate: endDate,
        });

        await subscription.save();
        await this.usageService.initializeUsage(userId, planType);

        logger.info(
          `Suscripción ${planType.toUpperCase()} creada para usuario: ${userId}`
        );
        return subscription;
      }

      throw new Error("Método de pago no soportado");
    } catch (error: any) {
      logger.error("Error creando suscripción:", error);
      throw error;
    }
  }

  async getSubscription(userId: string): Promise<ISubscription | null> {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: { $in: ["active", "trial"] },
      }).sort({ createdAt: -1 });

      // Si no tiene suscripción, crear una básica automáticamente
      if (!subscription) {
        return await this.createSubscription(userId, PlanType.BASIC);
      }

      return subscription;
    } catch (error: any) {
      logger.error("Error obteniendo suscripción:", error);
      throw error;
    }
  }

  async upgradeSubscription(
    userId: string,
    newPlanType: PlanType
  ): Promise<ISubscription> {
    try {
      const currentSubscription = await this.getSubscription(userId);
      if (!currentSubscription) {
        throw new Error("No se encontró suscripción activa");
      }

      if (!currentSubscription.canUpgrade()) {
        throw new Error("No es posible hacer upgrade desde este plan");
      }

      // Verificar que sea un upgrade real
      const planHierarchy = {
        basic: 1,
        premium: 2,
        enterprise: 3,
      };

      if (
        planHierarchy[newPlanType] <=
        planHierarchy[currentSubscription.planType]
      ) {
        throw new Error("El nuevo plan debe ser superior al actual");
      }

      // Cancelar suscripción actual
      if (currentSubscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          currentSubscription.stripeSubscriptionId
        );
      }

      currentSubscription.status = "cancelled";
      currentSubscription.cancelledAt = new Date();
      await currentSubscription.save();

      // Crear nueva suscripción
      const newSubscription = await this.createSubscription(
        userId,
        newPlanType,
        "stripe"
      );

      logger.info(
        `Usuario ${userId} upgraded de ${currentSubscription.planType} a ${newPlanType}`
      );

      return newSubscription;
    } catch (error: any) {
      logger.error("Error en upgrade:", error);
      throw error;
    }
  }

  async downgradeSubscription(
    userId: string,
    newPlanType: PlanType
  ): Promise<ISubscription> {
    try {
      const currentSubscription = await this.getSubscription(userId);
      if (!currentSubscription) {
        throw new Error("No se encontró suscripción activa");
      }

      if (!currentSubscription.canDowngrade()) {
        throw new Error("No es posible hacer downgrade desde este plan");
      }

      // El downgrade se efectúa al final del período actual
      currentSubscription.metadata.pendingDowngrade = {
        newPlanType,
        scheduledFor: currentSubscription.endDate,
      };

      await currentSubscription.save();

      logger.info(
        `Downgrade programado para usuario ${userId} de ${currentSubscription.planType} a ${newPlanType}`
      );

      return currentSubscription;
    } catch (error: any) {
      logger.error("Error en downgrade:", error);
      throw error;
    }
  }

  async cancelSubscription(
    userId: string,
    reason?: string
  ): Promise<ISubscription> {
    try {
      const subscription = await this.getSubscription(userId);
      if (!subscription) {
        throw new Error("No se encontró suscripción activa");
      }

      // No se puede cancelar plan básico
      if (subscription.planType === PlanType.BASIC) {
        throw new Error("No puedes cancelar el plan básico");
      }

      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId
        );
      }

      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = reason ?? "";
      subscription.autoRenew = false;

      await subscription.save();

      // Crear suscripción básica automáticamente
      await this.createSubscription(userId, PlanType.BASIC);

      logger.info(`Suscripción cancelada para usuario: ${userId}`);

      return subscription;
    } catch (error: any) {
      logger.error("Error cancelando suscripción:", error);
      throw error;
    }
  }

  async renewSubscription(subscriptionId: string): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error("Suscripción no encontrada");
      }

      const newEndDate = new Date(subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      subscription.endDate = newEndDate;
      subscription.lastPaymentDate = new Date();
      subscription.nextPaymentDate = newEndDate;
      subscription.status = "active";

      await subscription.save();

      logger.info(`Suscripción renovada: ${subscriptionId}`);

      return subscription;
    } catch (error: any) {
      logger.error("Error renovando suscripción:", error);
      throw error;
    }
  }

  async checkAndUpdateExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubs = await Subscription.find({
        status: "active",
        endDate: { $lt: new Date() },
        autoRenew: false,
      });

      for (const sub of expiredSubs) {
        sub.status = "expired";
        await sub.save();

        // Downgrade a básico
        await this.createSubscription(sub.userId, PlanType.BASIC);

        logger.info(`Suscripción expirada downgraded a básico: ${sub.userId}`);
      }

      logger.info(`${expiredSubs.length} suscripciones expiradas procesadas`);
    } catch (error: any) {
      logger.error("Error verificando suscripciones expiradas:", error);
    }
  }
}
