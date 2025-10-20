import { body, param, query } from 'express-validator';

// Validaciones para crear factura
export const validateCreateInvoice = [
  body('appointmentId')
    .optional()
    .isMongoId()
    .withMessage('ID de cita inválido'),
  
  body('patientId')
    .isMongoId()
    .withMessage('ID de paciente es requerido'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un item'),
  
  body('items.*.description')
    .trim()
    .notEmpty()
    .withMessage('Descripción del item es requerida'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser al menos 1'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Precio unitario debe ser mayor o igual a 0'),
  
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Descuento debe estar entre 0 y 100'),
  
  body('insuranceInfo.provider')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Proveedor de seguro es requerido si se incluye información de seguro'),
  
  body('insuranceInfo.policyNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Número de póliza es requerido'),
  
  body('insuranceInfo.coveragePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Porcentaje de cobertura debe estar entre 0 y 100'),
];

// Validaciones para crear pago
export const validateCreatePayment = [
  param('invoiceId')
    .isMongoId()
    .withMessage('ID de factura inválido'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Monto debe ser mayor a 0'),
  
  body('paymentMethod')
    .isIn(['stripe', 'cash', 'bank_transfer', 'qr'])
    .withMessage('Método de pago inválido'),
  
  body('paymentDetails')
    .optional()
    .isObject()
    .withMessage('Detalles de pago deben ser un objeto'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
];

// Validaciones para procesar pago con Stripe
export const validateStripePayment = [
  param('invoiceId')
    .isMongoId()
    .withMessage('ID de factura inválido'),
  
  body('paymentMethodId')
    .trim()
    .notEmpty()
    .withMessage('ID del método de pago de Stripe es requerido'),
  
  body('savePaymentMethod')
    .optional()
    .isBoolean()
    .withMessage('savePaymentMethod debe ser booleano'),
];

// Validaciones para reembolso
export const validateRefund = [
  param('paymentId')
    .isMongoId()
    .withMessage('ID de pago inválido'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Monto de reembolso debe ser mayor a 0'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Razón del reembolso es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('Razón debe tener entre 5 y 500 caracteres'),
];

// Validaciones para búsqueda de facturas
export const validateGetInvoices = [
  query('patientId')
    .optional()
    .isMongoId()
    .withMessage('ID de paciente inválido'),
  
  query('doctorId')
    .optional()
    .isMongoId()
    .withMessage('ID de doctor inválido'),
  
  query('status')
    .optional()
    .isIn(['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
    .withMessage('Estado inválido'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde inválida'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta inválida'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe estar entre 1 y 100'),
];

// Validaciones para reportes
export const validateFinancialReport = [
  query('dateFrom')
    .isISO8601()
    .withMessage('Fecha desde es requerida y debe ser válida'),
  
  query('dateTo')
    .isISO8601()
    .withMessage('Fecha hasta es requerida y debe ser válida'),
  
  query('doctorId')
    .optional()
    .isMongoId()
    .withMessage('ID de doctor inválido'),
  
  query('facilityId')
    .optional()
    .isMongoId()
    .withMessage('ID de facility inválido'),
  
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Agrupación debe ser: day, week o month'),
];

// Validación de ID genérico
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido'),
];
