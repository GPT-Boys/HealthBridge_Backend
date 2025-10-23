// =====================================================
// src/controllers/medicalRecord.controller.ts
// =====================================================

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import type { IMedicalRecord } from '../models/MedicalRecord.js';
import { FileAttachment } from '../models/FileAttachment.js';
import { logger } from '../utils/logger.js';

class MedicalRecordController {
  // Crear nuevo registro médico
  async createRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const recordData = req.body;

      // Validar que el usuario sea doctor
      if (user.role !== 'doctor' && user.role !== 'admin') {
        res.status(403).json({
          error: 'Solo los doctores pueden crear registros médicos',
        });
        return;
      }

      // Crear registro
      const record = new MedicalRecord({
        ...recordData,
        doctorId: user.id,
      });

      await record.save();

      logger.info('Registro médico creado:', {
        recordId: record._id,
        patientId: record.patientId,
        doctorId: record.doctorId,
      });

      res.status(201).json({
        success: true,
        message: 'Registro médico creado exitosamente',
        data: record,
      });
    } catch (error: any) {
      logger.error('Error creando registro médico:', error);
      res.status(500).json({
        error: 'Error creando registro médico',
        details: error.message,
      });
    }
  }

  // Obtener registros de un paciente
  async getPatientRecords(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const { type, startDate, endDate, limit = '50', skip = '0' } = req.query;

      // Construir query
      const query: any = { patientId };

      if (type) {
        query.type = type;
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
      }

      // Ejecutar query
      const records = await MedicalRecord.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(skip as string))
        .lean();

      const total = await MedicalRecord.countDocuments(query);

      logger.info('Registros médicos consultados:', {
        patientId,
        count: records.length,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: records,
        pagination: {
          total,
          limit: parseInt(limit as string),
          skip: parseInt(skip as string),
          hasMore: total > parseInt(skip as string) + records.length,
        },
      });
    } catch (error: any) {
      logger.error('Error obteniendo registros:', error);
      res.status(500).json({
        error: 'Error obteniendo registros médicos',
        details: error.message,
      });
    }
  }

  // Obtener un registro específico
  async getRecordById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const record = await MedicalRecord.findById(id).lean();

      if (!record) {
        res.status(404).json({
          error: 'Registro médico no encontrado',
        });
        return;
      }

      // Verificar acceso
      const user = req.user!;
      if (
        user.role === 'patient' &&
        user.id !== record.patientId
      ) {
        res.status(403).json({
          error: 'No tiene permisos para ver este registro',
        });
        return;
      }

      // Obtener archivos adjuntos si existen
      if (record.attachments && record.attachments.length > 0) {
        const files = await FileAttachment.find({
          _id: { $in: record.attachments },
          isDeleted: false,
        }).lean();

        (record as any).attachmentFiles = files;
      }

      logger.info('Registro médico consultado:', {
        recordId: id,
        userId: user.id,
      });

      res.json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      logger.error('Error obteniendo registro:', error);
      res.status(500).json({
        error: 'Error obteniendo registro médico',
        details: error.message,
      });
    }
  }

  // Actualizar registro médico
  async updateRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user!;

      // Buscar registro
      const record = await MedicalRecord.findById(id);

      if (!record) {
        res.status(404).json({
          error: 'Registro médico no encontrado',
        });
        return;
      }

      // Verificar que solo el doctor que creó el registro pueda editarlo
      if (user.role === 'doctor' && record.doctorId !== user.id) {
        res.status(403).json({
          error: 'Solo puede editar sus propios registros',
        });
        return;
      }

      // Actualizar
      Object.assign(record, updates);
      await record.save();

      logger.info('Registro médico actualizado:', {
        recordId: id,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Registro actualizado exitosamente',
        data: record,
      });
    } catch (error: any) {
      logger.error('Error actualizando registro:', error);
      res.status(500).json({
        error: 'Error actualizando registro médico',
        details: error.message,
      });
    }
  }

  // Eliminar registro médico (soft delete)
  async deleteRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Solo admin puede eliminar registros
      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Solo administradores pueden eliminar registros',
        });
        return;
      }

      const record = await MedicalRecord.findById(id);

      if (!record) {
        res.status(404).json({
          error: 'Registro médico no encontrado',
        });
        return;
      }

      // Marcar como privado en lugar de eliminar
      record.isPrivate = true;
      await record.save();

      logger.warn('Registro médico marcado como privado:', {
        recordId: id,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Registro marcado como privado',
      });
    } catch (error: any) {
      logger.error('Error eliminando registro:', error);
      res.status(500).json({
        error: 'Error eliminando registro médico',
        details: error.message,
      });
    }
  }

  // Obtener estadísticas de registros de un paciente
  async getPatientStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;

      const stats = await MedicalRecord.aggregate([
        { $match: { patientId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalRecords = await MedicalRecord.countDocuments({ patientId });
      const lastRecord = await MedicalRecord.findOne({ patientId }).sort({ date: -1 }).lean();

      res.json({
        success: true,
        data: {
          total: totalRecords,
          byType: stats,
          lastVisit: lastRecord?.date,
        },
      });
    } catch (error: any) {
      logger.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        error: 'Error obteniendo estadísticas',
        details: error.message,
      });
    }
  }
}

export default new MedicalRecordController();
