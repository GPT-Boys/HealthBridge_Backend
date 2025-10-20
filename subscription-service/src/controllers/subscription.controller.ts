import type { Request, Response } from "express";
import { SubscriptionService } from "../services/subscription.service.js";
import { UsageService } from "../services/usage.service.js";
import { StripeService } from "../services/stripe.service.js";
import { logger } from "../utils/logger.js";
import { PlanType } from "../utils/planLimits.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        [key: string]: any;
      };
    }
  }
}

export class SubscriptionController {
  private subscriptionService: SubscriptionService;
  private usageService: UsageService;
  private stripeService: StripeService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
    this.usageService = new UsageService();
    this.stripeService = new StripeService();
  }

  async getMySubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const subscription = await this.subscriptionService.getSubscription(
        userId
      );
      const usage = await this.usageService.getCurrentUsage(userId);

      res.json({
        subscription,
        usage,
      });
    } catch (error: any) {
      logger.error("Error obteniendo suscripción:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { planType, paymentMethod } = req.body;

      if (!planType) {
        res.status(400).json({ error: "Plan type requerido" });
        return;
      }

      const subscription = await this.subscriptionService.createSubscription(
        userId,
        planType as PlanType,
        paymentMethod
      );

      res.status(201).json({
        message: "Suscripción creada exitosamente",
        subscription,
      });
    } catch (error: any) {
      logger.error("Error creando suscripción:", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  }

  async upgradeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { planType } = req.body;

      if (!planType) {
        res.status(400).json({ error: "Nuevo plan requerido" });
        return;
      }

      const subscription = await this.subscriptionService.upgradeSubscription(
        userId,
        planType as PlanType
      );

      res.json({
        message: "Suscripción actualizada exitosamente",
        subscription,
      });
    } catch (error: any) {
      logger.error("Error en upgrade:", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  }

  async downgradeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { planType } = req.body;

      if (!planType) {
        res.status(400).json({ error: "Nuevo plan requerido" });
        return;
      }

      const subscription = await this.subscriptionService.downgradeSubscription(
        userId,
        planType as PlanType
      );

      res.json({
        message: "Downgrade programado exitosamente",
        subscription,
      });
    } catch (error: any) {
      logger.error("Error en downgrade:", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { reason } = req.body;

      const subscription = await this.subscriptionService.cancelSubscription(
        userId,
        reason
      );

      res.json({
        message: "Suscripción cancelada exitosamente",
        subscription,
      });
    } catch (error: any) {
      logger.error("Error cancelando suscripción:", error);
      res
        .status(500)
        .json({ error: error.message || "Error interno del servidor" });
    }
  }

  async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const { priceId } = req.body;

      if (!priceId) {
        res.status(400).json({ error: "Price ID requerido" });
        return;
      }

      const session = await this.stripeService.createCheckoutSession(
        userId,
        priceId
      );

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      logger.error("Error creando checkout session:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        res.status(400).json({ error: "Firma faltante" });
        return;
      }

      const event = await this.stripeService.handleWebhook(req.body, signature);

      // Procesar eventos de Stripe
      switch (event.type) {
        case "checkout.session.completed":
          // Manejar pago completado
          logger.info("Checkout completado:", event.data.object);
          break;

        case "customer.subscription.updated":
          // Manejar actualización de suscripción
          logger.info("Suscripción actualizada:", event.data.object);
          break;

        case "customer.subscription.deleted":
          // Manejar cancelación de suscripción
          logger.info("Suscripción cancelada:", event.data.object);
          break;

        default:
          logger.info(`Evento no manejado: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error("Error procesando webhook:", error);
      res.status(400).json({ error: error.message });
    }
  }
}
