import Stripe from 'stripe';
import ENV from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Invoice } from '../models/Invoice.js';
import { Payment, PaymentStatus, PaymentMethod } from '../models/Payment.js';
import { Transaction, TransactionType } from '../models/Transaction.js';

class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }

  /**
   * Crear un Payment Intent de Stripe
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    invoiceId: string,
    patientId: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe espera centavos
        currency: currency.toLowerCase(),
        metadata: {
          invoiceId,
          patientId,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info(`Payment Intent creado: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error: any) {
      logger.error('Error al crear Payment Intent:', error.message);
      throw new Error(`Error de Stripe: ${error.message}`);
    }
  }

  /**
   * Confirmar un pago con Payment Method
   */
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      logger.info(`Payment Intent confirmado: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error: any) {
      logger.error('Error al confirmar pago:', error.message);
      throw new Error(`Error al confirmar pago: ${error.message}`);
    }
  }

  /**
   * Procesar un pago completo con Stripe
   */
  async processPayment(
    invoiceId: string,
    paymentMethodId: string,
    userId: string
  ): Promise<InstanceType<typeof Payment>> {
    try {
      // Obtener la factura
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Factura no encontrada');
      }

      if (invoice.isPaid()) {
        throw new Error('La factura ya está pagada');
      }

      // Crear Payment Intent
      const paymentIntent = await this.createPaymentIntent(
        invoice.amountDue,
        invoice.currency,
        invoiceId,
        invoice.patientId.toString(),
        {
          invoiceNumber: invoice.invoiceNumber,
        }
      );

      // Confirmar el pago
      const confirmedPayment = await this.confirmPayment(
        paymentIntent.id,
        paymentMethodId
      );

      if (confirmedPayment.status !== 'succeeded') {
        throw new Error('El pago no se completó exitosamente');
      }

      // Crear registro de pago
      const payment = new Payment({
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        amount: invoice.amountDue,
        currency: invoice.currency,
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        paymentDetails: {
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: confirmedPayment.latest_charge as string,
          stripePaymentMethodId: paymentMethodId,
        },
        paymentDate: new Date(),
        processedDate: new Date(),
        createdBy: userId,
      });

      await payment.save();

      // Actualizar la factura
      await invoice.addPayment(invoice.amountDue);

      // Crear transacción
      await Transaction.create({
        invoiceId: invoice._id,
        paymentId: payment._id,
        patientId: invoice.patientId,
        doctorId: invoice.doctorId,
        type: TransactionType.PAYMENT,
        amount: invoice.amountDue,
        currency: invoice.currency,
        description: `Pago con Stripe para factura ${invoice.invoiceNumber}`,
        reference: paymentIntent.id,
        createdBy: userId,
      });

      logger.info(`Pago procesado exitosamente: ${payment._id}`);
      return payment;
    } catch (error: any) {
      logger.error('Error al procesar pago con Stripe:', error.message);
      throw error;
    }
  }

  /**
   * Crear un reembolso
   */
  async createRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (!payment.canBeRefunded()) {
        throw new Error('El pago no puede ser reembolsado');
      }

      const chargeId = payment.paymentDetails?.stripeChargeId;
      if (!chargeId) {
        throw new Error('No se encontró el ID de cargo de Stripe');
      }

      const refundAmount = amount || payment.getRemainingAmount();

      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: Math.round(refundAmount * 100),
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      logger.info(`Reembolso creado: ${refund.id}`);
      return refund;
    } catch (error: any) {
      logger.error('Error al crear reembolso:', error.message);
      throw new Error(`Error al crear reembolso: ${error.message}`);
    }
  }

  /**
   * Obtener información de un Payment Intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      logger.error('Error al obtener Payment Intent:', error.message);
      throw new Error(`Error al obtener Payment Intent: ${error.message}`);
    }
  }

  /**
   * Manejar webhook de Stripe
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        ENV.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`Webhook recibido: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.refunded':
          await this.handleRefund(event.data.object as Stripe.Charge);
          break;
        default:
          logger.info(`Evento no manejado: ${event.type}`);
      }
    } catch (error: any) {
      logger.error('Error al procesar webhook:', error.message);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Pago exitoso: ${paymentIntent.id}`);
    // Aquí puedes agregar lógica adicional si es necesario
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.warn(`Pago fallido: ${paymentIntent.id}`);
    
    // Buscar y actualizar el pago
    const payment = await Payment.findOne({
      'paymentDetails.stripePaymentIntentId': paymentIntent.id,
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = paymentIntent.last_payment_error?.message || 'Pago rechazado';
      await payment.save();
    }
  }

  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    logger.info(`Reembolso procesado para charge: ${charge.id}`);
    // Aquí puedes agregar lógica adicional si es necesario
  }
}

export const stripeService = new StripeService();
