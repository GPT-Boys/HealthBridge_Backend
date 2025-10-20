import mongoose, { Document, Schema } from 'mongoose';

// Enum para estado de factura
export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Interface para items de factura
export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  category?: string;
}

// Interface para información de seguro
export interface IInsuranceInfo {
  provider: string;
  policyNumber: string;
  coveragePercentage: number;
  coverageAmount: number;
  copayAmount: number;
  claimNumber?: string;
  claimStatus?: 'pending' | 'approved' | 'rejected' | 'processing';
  approvalDate?: Date;
}

// Interface principal de factura
export interface IInvoice extends Document {
  // Información básica
  invoiceNumber: string;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  facilityId?: mongoose.Types.ObjectId;
  
  // Relaciones
  appointmentId?: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  
  // Items y costos
  items: IInvoiceItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  insuranceCoverage: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  
  // Información de seguro
  hasInsurance: boolean;
  insuranceInfo?: IInsuranceInfo;
  
  // Estado y fechas
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  cancelledDate?: Date;
  
  // Metadata
  currency: string;
  notes?: string;
  internalNotes?: string;
  cancellationReason?: string;
  createdBy: mongoose.Types.ObjectId;
  
  // Auditoría
  statusHistory: Array<{
    status: InvoiceStatus;
    changedAt: Date;
    changedBy: mongoose.Types.ObjectId;
    reason?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  calculateTotals(): void;
  isPaid(): boolean;
  isOverdue(): boolean;
  canBeCancelled(): boolean;
  addPayment(amount: number): Promise<void>;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  description: {
    type: String,
    required: [true, 'Descripción del item es requerida'],
    trim: true,
    maxlength: [500, 'Descripción no puede exceder 500 caracteres'],
  },
  quantity: {
    type: Number,
    required: [true, 'Cantidad es requerida'],
    min: [1, 'Cantidad debe ser al menos 1'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Precio unitario es requerido'],
    min: [0, 'Precio no puede ser negativo'],
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal no puede ser negativo'],
  },
  category: {
    type: String,
    enum: ['consultation', 'procedure', 'medication', 'test', 'therapy', 'surgery', 'other'],
    default: 'other',
  },
}, { _id: false });

const insuranceInfoSchema = new Schema<IInsuranceInfo>({
  provider: {
    type: String,
    required: true,
    trim: true,
  },
  policyNumber: {
    type: String,
    required: true,
    trim: true,
  },
  coveragePercentage: {
    type: Number,
    required: true,
    min: [0, 'Cobertura no puede ser negativa'],
    max: [100, 'Cobertura no puede exceder 100%'],
  },
  coverageAmount: {
    type: Number,
    required: true,
    min: [0, 'Monto de cobertura no puede ser negativo'],
  },
  copayAmount: {
    type: Number,
    required: true,
    min: [0, 'Copago no puede ser negativo'],
  },
  claimNumber: String,
  claimStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing'],
    default: 'pending',
  },
  approvalDate: Date,
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID del paciente es requerido'],
    index: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    index: true,
  },
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true,
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true,
  },
  items: {
    type: [invoiceItemSchema],
    required: [true, 'Debe incluir al menos un item'],
    validate: {
      validator: function(items: IInvoiceItem[]) {
        return items.length > 0;
      },
      message: 'La factura debe tener al menos un item',
    },
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal no puede ser negativo'],
    default: 0,
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Descuento no puede ser negativo'],
    max: [100, 'Descuento no puede exceder 100%'],
    default: 0,
  },
  discountAmount: {
    type: Number,
    min: [0, 'Monto de descuento no puede ser negativo'],
    default: 0,
  },
  insuranceCoverage: {
    type: Number,
    min: [0, 'Cobertura de seguro no puede ser negativa'],
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total no puede ser negativo'],
    default: 0,
  },
  amountPaid: {
    type: Number,
    min: [0, 'Monto pagado no puede ser negativo'],
    default: 0,
  },
  amountDue: {
    type: Number,
    min: [0, 'Monto pendiente no puede ser negativo'],
    default: 0,
  },
  hasInsurance: {
    type: Boolean,
    default: false,
  },
  insuranceInfo: insuranceInfoSchema,
  status: {
    type: String,
    enum: Object.values(InvoiceStatus),
    required: true,
    default: InvoiceStatus.DRAFT,
    index: true,
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  paidDate: Date,
  cancelledDate: Date,
  currency: {
    type: String,
    required: true,
    default: 'BOB',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas no pueden exceder 1000 caracteres'],
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas internas no pueden exceder 1000 caracteres'],
  },
  cancellationReason: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: String,
  }],
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
invoiceSchema.index({ patientId: 1, status: 1 });
invoiceSchema.index({ doctorId: 1, issueDate: -1 });
invoiceSchema.index({ issueDate: -1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

// Middleware pre-save para calcular totales
invoiceSchema.pre('save', function(this: IInvoice, next) {
  this.calculateTotals();
  next();
});

// Métodos de instancia
invoiceSchema.methods.calculateTotals = function(this: IInvoice): void {
  // Calcular subtotal de items
  this.subtotal = this.items.reduce((total: number, item: IInvoiceItem) => {
    item.subtotal = item.quantity * item.unitPrice;
    return total + item.subtotal;
  }, 0);
  
  // Calcular descuento
  this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
  
  // Calcular cobertura de seguro
  if (this.hasInsurance && this.insuranceInfo) {
    this.insuranceCoverage = this.insuranceInfo.coverageAmount;
  } else {
    this.insuranceCoverage = 0;
  }
  
  // Calcular total
  this.totalAmount = this.subtotal - this.discountAmount - this.insuranceCoverage;
  
  // Asegurar que el total no sea negativo
  if (this.totalAmount < 0) {
    this.totalAmount = 0;
  }
  
  // Calcular monto pendiente
  this.amountDue = this.totalAmount - this.amountPaid;
  
  // Actualizar estado basado en pagos
  if (this.amountPaid === 0 && this.status === InvoiceStatus.ISSUED) {
    // Verificar si está vencida
    if (new Date() > this.dueDate) {
      this.status = InvoiceStatus.OVERDUE;
    }
  } else if (this.amountPaid > 0 && this.amountPaid < this.totalAmount) {
    this.status = InvoiceStatus.PARTIALLY_PAID;
  } else if (this.amountPaid >= this.totalAmount && this.totalAmount > 0) {
    this.status = InvoiceStatus.PAID;
    if (!this.paidDate) {
      this.paidDate = new Date();
    }
  }
};

invoiceSchema.methods.isPaid = function(this: IInvoice): boolean {
  return this.status === InvoiceStatus.PAID || this.amountPaid >= this.totalAmount;
};

invoiceSchema.methods.isOverdue = function(this: IInvoice): boolean {
  return (
    this.status !== InvoiceStatus.PAID &&
    this.status !== InvoiceStatus.CANCELLED &&
    this.status !== InvoiceStatus.REFUNDED &&
    new Date() > this.dueDate
  );
};

invoiceSchema.methods.canBeCancelled = function(this: IInvoice): boolean {
  return (
    this.status !== InvoiceStatus.PAID &&
    this.status !== InvoiceStatus.CANCELLED &&
    this.status !== InvoiceStatus.REFUNDED
  );
};

invoiceSchema.methods.addPayment = async function(this: IInvoice, amount: number): Promise<void> {
  this.amountPaid += amount;
  this.calculateTotals();
  await this.save();
};

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
