// =====================================================
// src/controllers/prescription.controller.ts
// =====================================================

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { Prescription } from '../models/Prescription.js';
import { logger } from '../utils/logger.js';

class PrescriptionController {
  // Crear prescripción
  async createPrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const prescriptionData = req.body;

      // Solo doctores pueden crear prescripciones
      if (user.role !== 'doctor' && user.role !== 'admin') {
        res.status(403).json({
          error: 'Solo los doctores pueden crear prescripciones',
        });
        return;
      }

      const prescription = new Prescription({
        ...prescriptionData,
        doctorId: user.id,
        doctorSignature: {
          signed: true,
          signedAt: new Date(),
        },
      });

      await prescription.save();

      logger.info('Prescripción creada:', {
        prescriptionId: prescription._id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
      });

      res.status(201).json({
        success: true,
        message: 'Prescripción creada exitosamente',
        data: prescription,
      });
    } catch (error: any) {
      logger.error('Error creando prescripción:', error);
      res.status(500).json({
        error: 'Error creando prescripción',
        details: error.message,
      });
    }
  }

  // Obtener prescripciones de un paciente
  async getPatientPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const { status } = req.query;

      const query: any = { patientId };
      if (status) {
        query.status = status;
      }

      const prescriptions = await Prescription.find(query)
        .sort({ date: -1 })
        .lean();

      res.json({
        success: true,
        data: prescriptions,
      });
    } catch (error: any) {
      logger.error('Error obteniendo prescripciones:', error);
      res.status(500).json({
        error: 'Error obteniendo prescripciones',
        details: error.message,
      });
    }
  }

  // Obtener prescripción por ID
  async getPrescriptionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const prescription = await Prescription.findById(id).lean();

      if (!prescription) {
        res.status(404).json({
          error: 'Prescripción no encontrada',
        });
        return;
      }

      res.json({
        success: true,
        data: prescription,
      });
    } catch (error: any) {
      logger.error('Error obteniendo prescripción:', error);
      res.status(500).json({
        error: 'Error obteniendo prescripción',
        details: error.message,
      });
    }
  }

  // Actualizar prescripción
  async updatePrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user!;

      const prescription = await Prescription.findById(id);

      if (!prescription) {
        res.status(404).json({
          error: 'Prescripción no encontrada',
        });
        return;
      }

      // Solo el doctor que creó la prescripción puede editarla
      if (user.role === 'doctor' && prescription.doctorId !== user.id) {
        res.status(403).json({
          error: 'Solo puede editar sus propias prescripciones',
        });
        return;
      }

      Object.assign(prescription, updates);
      await prescription.save();

      logger.info('Prescripción actualizada:', {
        prescriptionId: id,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Prescripción actualizada exitosamente',
        data: prescription,
      });
    } catch (error: any) {
      logger.error('Error actualizando prescripción:', error);
      res.status(500).json({
        error: 'Error actualizando prescripción',
        details: error.message,
      });
    }
  }

  // Cancelar prescripción
  async cancelPrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const prescription = await Prescription.findById(id);

      if (!prescription) {
        res.status(404).json({
          error: 'Prescripción no encontrada',
        });
        return;
      }

      // Solo el doctor que creó la prescripción puede cancelarla
      if (user.role === 'doctor' && prescription.doctorId !== user.id) {
        res.status(403).json({
          error: 'Solo puede cancelar sus propias prescripciones',
        });
        return;
      }

      prescription.status = 'cancelled';
      await prescription.save();

      logger.warn('Prescripción cancelada:', {
        prescriptionId: id,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Prescripción cancelada exitosamente',
        data: prescription,
      });
    } catch (error: any) {
      logger.error('Error cancelando prescripción:', error);
      res.status(500).json({
        error: 'Error cancelando prescripción',
        details: error.message,
      });
    }
  }
}

export default new PrescriptionController();
