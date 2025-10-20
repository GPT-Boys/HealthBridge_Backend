import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateCreatePayment, validateRefund, validateStripePayment, validateId } from '../utils/validators.js';

const router = Router();

// Todas requieren autenticación salvo webhook
router.use(authenticate);

// Crear pago manual
router.post(
  '/invoice/:invoiceId/manual',
  authorize('admin', 'doctor'),
  validateCreatePayment,
  validateRequest,
  paymentController.createManualPayment.bind(paymentController)
);

// Pago con Stripe
router.post(
  '/invoice/:invoiceId/stripe',
  authorize('admin', 'doctor', 'patient'),
  validateStripePayment,
  validateRequest,
  paymentController.processStripePayment.bind(paymentController)
);

// Reembolso
router.post(
  '/:paymentId/refund',
  authorize('admin'),
  validateRefund,
  validateRequest,
  paymentController.refundPayment.bind(paymentController)
);

// Listar pagos
router.get('/', authorize('admin', 'doctor'), paymentController.getPayments.bind(paymentController));

// Obtener pago por ID
router.get('/:id', authorize('admin', 'doctor', 'patient'), validateId, validateRequest, paymentController.getPaymentById.bind(paymentController));

export default router;
