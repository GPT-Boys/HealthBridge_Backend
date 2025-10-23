// =====================================================
// src/routes/prescription.routes.ts
// =====================================================

import { Router } from 'express';
import prescriptionController from '../controllers/prescription.controller.js';
import { authenticate, authorize, checkPatientAccess } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// =====================================================
// RUTAS DE PRESCRIPCIONES
// =====================================================

// Crear prescripción
router.post(
  '/',
  authorize('doctor', 'admin'),
  prescriptionController.createPrescription
);

// Obtener prescripciones de un paciente
router.get(
  '/patient/:patientId',
  checkPatientAccess,
  prescriptionController.getPatientPrescriptions
);

// Obtener prescripción por ID
router.get(
  '/:id',
  prescriptionController.getPrescriptionById
);

// Actualizar prescripción
router.put(
  '/:id',
  authorize('doctor', 'admin'),
  prescriptionController.updatePrescription
);

// Cancelar prescripción
router.post(
  '/:id/cancel',
  authorize('doctor', 'admin'),
  prescriptionController.cancelPrescription
);

export default router;
