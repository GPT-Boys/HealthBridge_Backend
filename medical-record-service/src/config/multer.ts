// =====================================================
// src/config/multer.ts
// =====================================================

import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';
import ENV from './env.js';
import { logger } from '../utils/logger.js';

// Crear directorio de uploads si no existe
const uploadDir = ENV.UPLOAD_PATH;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`📁 Directorio de uploads creado: ${uploadDir}`);
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Filtro de archivos permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedTypes = ENV.ALLOWED_FILE_TYPES.split(',');

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${ext}. Permitidos: ${allowedTypes.join(', ')}`));
  }
};

// Configuración de multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE,
  },
});

// Función para eliminar archivo
export const deleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑️  Archivo eliminado: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error al eliminar archivo:', error);
  }
};

// Función para obtener tamaño de archivo
export const getFileSize = (filePath: string): number => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    logger.error('Error al obtener tamaño de archivo:', error);
    return 0;
  }
};
