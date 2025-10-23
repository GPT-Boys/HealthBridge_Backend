// =====================================================
// src/models/Prescription.ts
// =====================================================

import mongoose, { Document, Schema } from 'mongoose';

// Interface para prescripciones
export interface IPrescription extends Document {
  recordId?: string; // Puede o no estar asociado a un registro médico
  patientId: string;
  doctorId: string;
  
  // Información de la prescripción
  date: Date;
  validUntil?: Date;
  
  // Medicamentos
  medications: {
    name: string;
    genericName?: string;
    dosage: string; // Ej: "500mg"
    frequency: string; // Ej: "cada 8 horas"
    duration: string; // Ej: "7 días"
    route: 'oral' | 'intravenous' | 'intramuscular' | 'topical' | 'subcutaneous' | 'other';
    instructions?: string;
    quantity?: number;
  }[];
  
  // Diagnóstico asociado
  diagnosis?: string;
  
  // Notas e instrucciones generales
  notes?: string;
  instructions?: string;
  
  // Estado
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  
  // Renovaciones
  canRenew: boolean;
  renewalCount: number;
  maxRenewals?: number;
  
  // Firma digital (simulada)
  doctorSignature?: {
    signed: boolean;
    signedAt?: Date;
    licenseNumber?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    recordId: {
      type: String,
      index: true,
    },
    patientId: {
      type: String,
      required: [true, 'El ID del paciente es requerido'],
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, 'El ID del doctor es requerido'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'La fecha es requerida'],
      default: Date.now,
      index: true,
    },
    validUntil: {
      type: Date,
    },
    medications: [
      {
        name: {
          type: String,
          required: [true, 'El nombre del medicamento es requerido'],
        },
        genericName: String,
        dosage: {
          type: String,
          required: [true, 'La dosis es requerida'],
        },
        frequency: {
          type: String,
          required: [true, 'La frecuencia es requerida'],
        },
        duration: {
          type: String,
          required: [true, 'La duración es requerida'],
        },
        route: {
          type: String,
          enum: ['oral', 'intravenous', 'intramuscular', 'topical', 'subcutaneous', 'other'],
          default: 'oral',
        },
        instructions: String,
        quantity: Number,
      },
    ],
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    canRenew: {
      type: Boolean,
      default: false,
    },
    renewalCount: {
      type: Number,
      default: 0,
    },
    maxRenewals: {
      type: Number,
      default: 0,
    },
    doctorSignature: {
      signed: {
        type: Boolean,
        default: false,
      },
      signedAt: Date,
      licenseNumber: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
prescriptionSchema.index({ patientId: 1, date: -1 });
prescriptionSchema.index({ doctorId: 1, date: -1 });
prescriptionSchema.index({ patientId: 1, status: 1 });
prescriptionSchema.index({ validUntil: 1, status: 1 });

// Middleware para verificar expiración
prescriptionSchema.pre('save', function (next) {
  if (this.validUntil && this.validUntil < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);
