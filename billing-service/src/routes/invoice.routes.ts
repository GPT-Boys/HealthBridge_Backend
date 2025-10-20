import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import {
  validateCreateInvoice,
  validateGetInvoices,
  validateId,
} from '../utils/validators.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   POST /api/invoices
 * @desc    Crear nueva factura
 * @access  Private (Admin, Doctor)
 */
router.post(
  '/',
  authorize('admin', 'doctor'),
  validateCreateInvoice,
  validateRequest,
  invoiceController.createInvoice.bind(invoiceController)
);

/**
 * @route   POST /api/invoices/appointment/:appointmentId
 * @desc    Crear factura desde cita completada
 * @access  Private (Admin, Doctor)
 */
router.post(
  '/appointment/:appointmentId',
  authorize('admin', 'doctor'),
  validateId,
  validateRequest,
  invoiceController.createInvoiceFromAppointment.bind(invoiceController)
);

/**
 * @route   GET /api/invoices
 * @desc    Listar facturas con filtros
 * @access  Private
 */
router.get(
  '/',
  validateGetInvoices,
  validateRequest,
  invoiceController.getInvoices.bind(invoiceController)
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Obtener factura por ID
 * @access  Private
 */
router.get(
  '/:id',
  validateId,
  validateRequest,
  invoiceController.getInvoiceById.bind(invoiceController)
);

/**
 * @route   PUT /api/invoices/:id/issue
 * @desc    Emitir factura (cambiar de draft a issued)
 * @access  Private (Admin, Doctor)
 */
router.put(
  '/:id/issue',
  authorize('admin', 'doctor'),
  validateId,
  validateRequest,
  invoiceController.issueInvoice.bind(invoiceController)
);

/**
 * @route   PUT /api/invoices/:id
 * @desc    Actualizar factura (solo en estado draft)
 * @access  Private (Admin, Doctor)
 */
router.put(
  '/:id',
  authorize('admin', 'doctor'),
  validateId,
  validateRequest,
  invoiceController.updateInvoice.bind(invoiceController)
);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Cancelar factura
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize('admin'),
  validateId,
  validateRequest,
  invoiceController.cancelInvoice.bind(invoiceController)
);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Descargar factura en PDF
 * @access  Private
 */
router.get(
  '/:id/pdf',
  validateId,
  validateRequest,
  invoiceController.downloadInvoicePDF.bind(invoiceController)
);

/**
 * @route   POST /api/invoices/:id/email
 * @desc    Enviar factura por email
 * @access  Private (Admin, Doctor)
 */
router.post(
  '/:id/email',
  authorize('admin', 'doctor'),
  validateId,
  validateRequest,
  invoiceController.sendInvoiceEmail.bind(invoiceController)
);

export default router;
