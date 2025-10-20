import mongoose, { Document, Schema } from 'mongoose';

// Enum para tipos de transacción
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  FEE = 'fee',
  DISCOUNT = 'discount'
}

// Interface principal de transacción
export interface ITransaction extends Document {
  // Relaciones
  invoiceId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  
  // Información de transacción
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  
  // Metadata
  reference?: string;
  metadata?: Record<string, any>;
  
  // Auditoría
  createdBy: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true,
  },
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    index: true,
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID de paciente es requerido'],
    index: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: [true, 'Tipo de transacción es requerido'],
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Monto es requerido'],
  },
  currency: {
    type: String,
    required: true,
    default: 'BOB',
  },
  description: {
    type: String,
    required: [true, 'Descripción es requerida'],
    trim: true,
    maxlength: [500, 'Descripción no puede exceder 500 caracteres'],
  },
  reference: {
    type: String,
    trim: true,
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
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
transactionSchema.index({ patientId: 1, createdAt: -1 });
transactionSchema.index({ doctorId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
