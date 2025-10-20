import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Payment, PaymentMethod, PaymentStatus } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Transaction, TransactionType } from '../models/Transaction.js';
import { stripeService } from '../services/stripe.service.js';
import { logger } from '../utils/logger.js';

class PaymentController {
  /**
   * Crear pago manual (cash, bank_transfer, qr)
   */
  async createManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { amount, paymentMethod, paymentDetails, notes } = req.body as {
        amount: number;
        paymentMethod: PaymentMethod;
        paymentDetails?: Record<string, any>;
        notes?: string;
      };

      if (!['cash', 'bank_transfer', 'qr'].includes(paymentMethod)) {
        res.status(400).json({ success: false, message: 'Método de pago inválido para pago manual' });
        return;
      }

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        res.status(404).json({ success: false, message: 'Factura no encontrada' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ success: false, message: 'Monto debe ser mayor a 0' });
        return;
      }

      if (amount > invoice.amountDue) {
        res.status(400).json({ success: false, message: 'Monto excede el saldo pendiente' });
        return;
      }

      const userId = (req as any).user?.id as string;

      const payment = await Payment.create({
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        amount,
        currency: invoice.currency,
        paymentMethod: paymentMethod as PaymentMethod,
        status: PaymentStatus.COMPLETED,
        paymentDetails: paymentDetails || {},
        notes,
        paymentDate: new Date(),
        processedDate: new Date(),
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      await invoice.addPayment(amount);

      await Transaction.create({
        invoiceId: invoice._id,
        paymentId: payment._id,
        patientId: invoice.patientId,
        doctorId: invoice.doctorId,
        type: TransactionType.PAYMENT,
        amount,
        currency: invoice.currency,
        description: `Pago ${paymentMethod} para factura ${invoice.invoiceNumber}`,
        reference: (payment as any)._id.toString(),
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Procesar pago con Stripe
   */
  async processStripePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { paymentMethodId } = req.body as { paymentMethodId: string };
      const userId = (req as any).user?.id as string;

      const payment = await stripeService.processPayment(invoiceId, paymentMethodId, userId);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear reembolso
   */
  async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body as { amount?: number; reason?: string };
      const userId = (req as any).user?.id as string;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        res.status(404).json({ success: false, message: 'Pago no encontrado' });
        return;
      }

      const invoice = await Invoice.findById(payment.invoiceId);
      if (!invoice) {
        res.status(404).json({ success: false, message: 'Factura asociada no encontrada' });
        return;
      }

      const refundAmount = amount ?? payment.getRemainingAmount();
      if (refundAmount <= 0) {
        res.status(400).json({ success: false, message: 'Monto de reembolso inválido' });
        return;
      }

      // Stripe: usar API de reembolso
      if (payment.paymentMethod === PaymentMethod.STRIPE) {
        const refund = await stripeService.createRefund(paymentId, refundAmount, reason);

        // Registrar transacción de reembolso
        await Transaction.create({
          invoiceId: payment.invoiceId,
          paymentId: payment._id,
          patientId: payment.patientId,
          type: TransactionType.REFUND,
          amount: -Math.abs(refundAmount),
          currency: payment.currency,
          description: `Reembolso Stripe: ${reason || 'sin razón'}`,
          reference: refund.id,
          createdBy: new mongoose.Types.ObjectId(userId),
        });

        res.json({ success: true, data: refund });
        return;
      }

      // Manual: registrar reembolso en el documento de pago
      if (!payment.canBeRefunded()) {
        res.status(400).json({ success: false, message: 'El pago no puede ser reembolsado' });
        return;
      }

      payment.refunds.push({
        amount: refundAmount,
        reason: reason || 'Reembolso manual',
        refundedBy: new mongoose.Types.ObjectId(userId),
        refundedAt: new Date(),
        status: 'completed',
      });

      // Si el total reembolsado alcanza el monto del pago, marcar como refunded
      if (payment.getTotalRefunded() >= payment.amount) {
        payment.status = PaymentStatus.REFUNDED;
      }

      await payment.save();

      await Transaction.create({
        invoiceId: payment.invoiceId,
        paymentId: payment._id,
        patientId: payment.patientId,
        type: TransactionType.REFUND,
        amount: -Math.abs(refundAmount),
        currency: payment.currency,
        description: `Reembolso manual: ${reason || 'sin razón'}`,
        reference: (payment as any)._id.toString(),
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      // Ajustar la factura: incrementar saldo pendiente
      if (invoice) {
        invoice.amountPaid = Math.max(0, invoice.amountPaid - refundAmount);
        invoice.calculateTotals();
        await invoice.save();
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar pagos con filtros
   */
  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, patientId, status, dateFrom, dateTo, page = '1', limit = '10' } = req.query as Record<string, string>;

      const query: any = {};
      if (invoiceId) query.invoiceId = invoiceId;
      if (patientId) query.patientId = patientId;
      if (status) query.status = status;
      if (dateFrom || dateTo) {
        query.paymentDate = {};
        if (dateFrom) query.paymentDate.$gte = new Date(dateFrom);
        if (dateTo) query.paymentDate.$lte = new Date(dateTo);
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = Math.min(100, parseInt(limit, 10) || 10);
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        Payment.find(query).sort({ paymentDate: -1 }).skip(skip).limit(limitNum),
        Payment.countDocuments(query),
      ]);

      res.json({ success: true, data: items, pagination: { page: pageNum, limit: limitNum, total } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener pago por ID
   */
  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      if (!payment) {
        res.status(404).json({ success: false, message: 'Pago no encontrado' });
        return;
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook de Stripe
   */
  async stripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const payload = (req as any).rawBody || (req as any).body; // será raw por middleware específico
      await stripeService.handleWebhook(payload, sig);
      res.status(200).send('[OK]');
    } catch (error: any) {
      logger.error('Error en webhook de Stripe:', error.message);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
}

export const paymentController = new PaymentController();
