import Stripe from "stripe";
import { stripe } from "../config/stripe.config.js";
import { logger } from "../utils/logger.js";
import ENV from "../config/env.js";

export class StripeService {
  async createCustomer(
    userId: string,
    email: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      logger.info(`Cliente Stripe creado: ${customer.id}`);
      return customer;
    } catch (error: any) {
      logger.error("Error creando cliente Stripe:", error);
      throw error;
    }
  }

  async createSubscription(
    userId: string,
    priceId: string
  ): Promise<{ customerId: string; subscriptionId: string }> {
    try {
      // Buscar o crear customer
      const customers = await stripe.customers.list({
        limit: 1,
        email: `user-${userId}@healthbridge.bo`, // Esto debería venir del user service
      });

      let customer: Stripe.Customer;
      if (customers.data.length > 0) {
        customer = customers.data[0]!;
      } else {
        customer = await this.createCustomer(
          userId,
          `user-${userId}@healthbridge.bo`
        );
      }

      // Crear suscripción
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      });

      logger.info(`Suscripción Stripe creada: ${subscription.id}`);

      return {
        customerId: customer.id,
        subscriptionId: subscription.id,
      };
    } catch (error: any) {
      logger.error("Error creando suscripción Stripe:", error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      logger.info(`Suscripción Stripe cancelada: ${subscriptionId}`);
    } catch (error: any) {
      logger.error("Error cancelando suscripción Stripe:", error);
      throw error;
    }
  }

  async createCheckoutSession(
    userId: string,
    priceId: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${ENV.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${ENV.FRONTEND_URL}/subscription/cancel`,
        metadata: {
          userId,
        },
      });

      logger.info(`Checkout session creada: ${session.id}`);
      return session;
    } catch (error: any) {
      logger.error("Error creando checkout session:", error);
      throw error;
    }
  }

  async handleWebhook(
    body: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        ENV.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`Webhook recibido: ${event.type}`);
      return event;
    } catch (error: any) {
      logger.error("Error procesando webhook:", error);
      throw error;
    }
  }
}
