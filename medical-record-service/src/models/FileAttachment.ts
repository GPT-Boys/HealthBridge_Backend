// =====================================================
// src/models/FileAttachment.ts
// =====================================================

import mongoose, { Document, Schema } from 'mongoose';

// Interface para archivos adjuntos
export interface IFileAttachment extends Document {
  recordId: string; // ID del Medical Record
  patientId: string;
  uploadedBy: string; // ID del usuario que subió el archivo
  
  // Información del archivo
  originalName: string;
  filename: string; // Nombre único en el servidor
  filePath: string;
  mimeType: string;
  fileSize: number; // en bytes
  fileExtension: string;
  
  // Clasificación
  category: 'lab_result' | 'imaging' | 'prescription' | 'report' | 'consent' | 'insurance' | 'other';
  description?: string;
  
  // Metadatos
  uploadDate: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const fileAttachmentSchema = new Schema<IFileAttachment>(
  {
    recordId: {
      type: String,
      required: [true, 'El ID del registro médico es requerido'],
      index: true,
    },
    patientId: {
      type: String,
      required: [true, 'El ID del paciente es requerido'],
      index: true,
    },
    uploadedBy: {
      type: String,
      required: [true, 'El ID del usuario que sube el archivo es requerido'],
    },
    originalName: {
      type: String,
      required: [true, 'El nombre original del archivo es requerido'],
      trim: true,
    },
    filename: {
      type: String,
      required: [true, 'El nombre único del archivo es requerido'],
      unique: true,
    },
    filePath: {
      type: String,
      required: [true, 'La ruta del archivo es requerida'],
    },
    mimeType: {
      type: String,
      required: [true, 'El tipo MIME es requerido'],
    },
    fileSize: {
      type: Number,
      required: [true, 'El tamaño del archivo es requerido'],
    },
    fileExtension: {
      type: String,
      required: [true, 'La extensión del archivo es requerida'],
    },
    category: {
      type: String,
      enum: ['lab_result', 'imaging', 'prescription', 'report', 'consent', 'insurance', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      trim: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: String,
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
fileAttachmentSchema.index({ patientId: 1, isDeleted: 1 });
fileAttachmentSchema.index({ recordId: 1, isDeleted: 1 });
fileAttachmentSchema.index({ category: 1, uploadDate: -1 });

export const FileAttachment = mongoose.model<IFileAttachment>('FileAttachment', fileAttachmentSchema);
