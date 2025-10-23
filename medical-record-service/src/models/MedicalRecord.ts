// =====================================================
// src/models/MedicalRecord.ts
// =====================================================

import mongoose, { Document, Schema } from 'mongoose';

// Interface para el documento de Medical Record
export interface IMedicalRecord extends Document {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  date: Date;
  type: 'consultation' | 'diagnosis' | 'treatment' | 'test_result' | 'surgery' | 'emergency' | 'other';
  
  // Información general
  chiefComplaint: string; // Motivo de consulta
  presentIllness?: string; // Historia de la enfermedad actual
  
  // Signos vitales
  vitals?: {
    bloodPressure?: string; // Ej: "120/80"
    heartRate?: number; // ppm
    temperature?: number; // °C
    respiratoryRate?: number; // rpm
    oxygenSaturation?: number; // %
    weight?: number; // kg
    height?: number; // cm
    bmi?: number;
  };
  
  // Examen físico
  physicalExam?: string;
  
  // Diagnósticos
  diagnoses: {
    code?: string; // CIE-10
    description: string;
    type: 'principal' | 'secondary' | 'differential';
  }[];
  
  // Tratamiento y plan
  treatment?: string;
  medications?: string[];
  procedures?: string[];
  
  // Laboratorio y estudios
  labTests?: {
    test: string;
    result?: string;
    date?: Date;
    status: 'ordered' | 'pending' | 'completed';
  }[];
  
  // Notas adicionales
  notes?: string;
  
  // Próxima cita / seguimiento
  followUp?: {
    required: boolean;
    date?: Date;
    notes?: string;
  };
  
  // Archivos adjuntos (referencias a FileAttachment)
  attachments: string[]; // Array de IDs de FileAttachment
  
  // Metadatos
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
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
    appointmentId: {
      type: String,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'La fecha es requerida'],
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      enum: ['consultation', 'diagnosis', 'treatment', 'test_result', 'surgery', 'emergency', 'other'],
      required: [true, 'El tipo de registro es requerido'],
      default: 'consultation',
    },
    chiefComplaint: {
      type: String,
      required: [true, 'El motivo de consulta es requerido'],
      trim: true,
    },
    presentIllness: {
      type: String,
      trim: true,
    },
    vitals: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number,
      weight: Number,
      height: Number,
      bmi: Number,
    },
    physicalExam: {
      type: String,
      trim: true,
    },
    diagnoses: [
      {
        code: String,
        description: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['principal', 'secondary', 'differential'],
          default: 'principal',
        },
      },
    ],
    treatment: {
      type: String,
      trim: true,
    },
    medications: [String],
    procedures: [String],
    labTests: [
      {
        test: {
          type: String,
          required: true,
        },
        result: String,
        date: Date,
        status: {
          type: String,
          enum: ['ordered', 'pending', 'completed'],
          default: 'ordered',
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    followUp: {
      required: {
        type: Boolean,
        default: false,
      },
      date: Date,
      notes: String,
    },
    attachments: [
      {
        type: String,
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos para búsquedas eficientes
medicalRecordSchema.index({ patientId: 1, date: -1 });
medicalRecordSchema.index({ doctorId: 1, date: -1 });
medicalRecordSchema.index({ patientId: 1, type: 1 });

// Middleware para calcular BMI si hay peso y altura
medicalRecordSchema.pre('save', function (next) {
  if (this.vitals?.weight && this.vitals?.height) {
    const heightInMeters = this.vitals.height / 100;
    this.vitals.bmi = Number((this.vitals.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
  next();
});

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
