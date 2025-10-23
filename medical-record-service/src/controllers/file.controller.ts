// =====================================================
// src/controllers/file.controller.ts
// =====================================================

import type { Response } from 'express';
import path from 'path';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { FileAttachment } from '../models/FileAttachment.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { deleteFile } from '../config/multer.js';
import { logger } from '../utils/logger.js';

class FileController {
  // Subir archivo a un registro médico
  async uploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { recordId } = req.params;
      const { category, description } = req.body;
      const user = req.user!;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: 'No se proporcionó ningún archivo',
        });
        return;
      }

      // Verificar que el registro existe
      const record = await MedicalRecord.findById(recordId);

      if (!record) {
        // Eliminar archivo si el registro no existe
        deleteFile(file.path);
        res.status(404).json({
          error: 'Registro médico no encontrado',
        });
        return;
      }

      // Crear documento de archivo
      const fileAttachment = new FileAttachment({
        recordId,
        patientId: record.patientId,
        uploadedBy: user.id,
        originalName: file.originalname,
        filename: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileExtension: path.extname(file.originalname),
        category: category || 'other',
        description,
      });

      await fileAttachment.save();

      // Agregar referencia al registro médico
      if (!record.attachments) {
        record.attachments = [];
      }
        record.attachments.push(fileAttachment._id as any);
      await record.save();

      logger.info('Archivo subido:', {
        fileId: fileAttachment._id,
        recordId,
        userId: user.id,
        fileSize: file.size,
      });

      res.status(201).json({
        success: true,
        message: 'Archivo subido exitosamente',
        data: fileAttachment,
      });
    } catch (error: any) {
      // Eliminar archivo en caso de error
      if (req.file) {
        deleteFile(req.file.path);
      }

      logger.error('Error subiendo archivo:', error);
      res.status(500).json({
        error: 'Error subiendo archivo',
        details: error.message,
      });
    }
  }

  // Obtener archivos de un registro
  async getRecordFiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { recordId } = req.params;

      const files = await FileAttachment.find({
        recordId,
        isDeleted: false,
      }).lean();

      res.json({
        success: true,
        data: files,
      });
    } catch (error: any) {
      logger.error('Error obteniendo archivos:', error);
      res.status(500).json({
        error: 'Error obteniendo archivos',
        details: error.message,
      });
    }
  }

  // Eliminar archivo (soft delete)
  async deleteFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const user = req.user!;

      const file = await FileAttachment.findById(fileId);

      if (!file) {
        res.status(404).json({
          error: 'Archivo no encontrado',
        });
        return;
      }

      // Solo el que subió el archivo o un admin puede eliminarlo
      if (user.role !== 'admin' && file.uploadedBy !== user.id) {
        res.status(403).json({
          error: 'No tiene permisos para eliminar este archivo',
        });
        return;
      }

      // Soft delete
      file.isDeleted = true;
      file.deletedAt = new Date();
      file.deletedBy = user.id;
      await file.save();

      logger.info('Archivo eliminado (soft delete):', {
        fileId,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente',
      });
    } catch (error: any) {
      logger.error('Error eliminando archivo:', error);
      res.status(500).json({
        error: 'Error eliminando archivo',
        details: error.message,
      });
    }
  }

  // Descargar archivo
  async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      const file = await FileAttachment.findById(fileId);

      if (!file || file.isDeleted) {
        res.status(404).json({
          error: 'Archivo no encontrado',
        });
        return;
      }

      // Enviar archivo
      res.download(file.filePath, file.originalName, (err) => {
        if (err) {
          logger.error('Error descargando archivo:', err);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Error descargando archivo',
            });
          }
        }
      });

      logger.info('Archivo descargado:', {
        fileId,
        userId: req.user?.id,
      });
    } catch (error: any) {
      logger.error('Error descargando archivo:', error);
      res.status(500).json({
        error: 'Error descargando archivo',
        details: error.message,
      });
    }
  }
}

export default new FileController();
