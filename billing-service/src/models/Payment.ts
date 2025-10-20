import mongoose, { Document, Schema } from 'mongoose';

// Enum para estados de pago
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

// Enum para métodos de pago
export enum PaymentMethod {
  STRIPE = 'stripe',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  QR = 'qr'
}

// Interface para detalles de pago
export interface IPaymentDetails {
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripePaymentMethodId?: string;
  last4?: string;
  brand?: string;
  transactionId?: string;
  bankName?: string;
  accountNumber?: string;
  qrCode?: string;
  referenceNumber?: string;
}

// Interface para reembolso
export interface IRefund {
  amount: number;
  reason: string;
  refundedAt: Date;
  refundedBy: mongoose.Types.ObjectId;
  stripeRefundId?: string;
  status: 'pending' | 'completed' | 'failed';
}

// Interface principal de pago
export interface IPayment extends Document {
  // Relaciones
  invoiceId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  
  // Información de pago
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  
  // Detalles específicos del método
  paymentDetails?: IPaymentDetails;
  
  // Reembolsos
  refunds: IRefund[];
  refundedAmount: number;
  
  // Metadata
  receiptNumber?: string;
  notes?: string;
  failureReason?: string;
  
  // Fechas
  paymentDate: Date;
  processedDate?: Date;
  
  // Auditoría
  createdBy: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  canBeRefunded(): boolean;
  getTotalRefunded(): number;
  getRemainingAmount(): number;
}

const paymentDetailsSchema = new Schema<IPaymentDetails>({
  stripePaymentIntentId: String,
  stripeChargeId: String,
  stripePaymentMethodId: String,
  last4: String,
  brand: String,
  transactionId: String,
  bankName: String,
  accountNumber: String,
  qrCode: String,
  referenceNumber: String,
}, { _id: false });

const refundSchema = new Schema<IRefund>({
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Monto de reembolso debe ser mayor a 0'],
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Razón no puede exceder 500 caracteres'],
  },
  refundedAt: {
    type: Date,
    default: Date.now,
  },
  refundedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripeRefundId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
}, { _id: true });

const paymentSchema = new Schema<IPayment>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'ID de factura es requerido'],
    index: true,
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID de paciente es requerido'],
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Monto es requerido'],
    min: [0.01, 'Monto debe ser mayor a 0'],
  },
  currency: {
    type: String,
    required: true,
    default: 'BOB',
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: [true, 'Método de pago es requerido'],
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.PENDING,
    index: true,
  },
  paymentDetails: paymentDetailsSchema,
  refunds: [refundSchema],
  refundedAmount: {
    type: Number,
    min: [0, 'Monto reembolsado no puede ser negativo'],
    default: 0,
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas no pueden exceder 1000 caracteres'],
  },
  failureReason: String,
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  processedDate: Date,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Índices compuestos
paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ patientId: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: -1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Métodos de instancia
paymentSchema.methods.canBeRefunded = function(this: IPayment): boolean {
  return (
    this.status === PaymentStatus.COMPLETED &&
    this.getRemainingAmount() > 0
  );
};

paymentSchema.methods.getTotalRefunded = function(this: IPayment): number {
  return this.refunds
    .filter((refund: IRefund) => refund.status === 'completed')
    .reduce((total: number, refund: IRefund) => total + refund.amount, 0);
};

paymentSchema.methods.getRemainingAmount = function(this: IPayment): number {
  return this.amount - this.getTotalRefunded();
};

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
