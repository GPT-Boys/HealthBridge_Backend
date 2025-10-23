// =====================================================
// src/routes/medicalRecord.routes.ts
// =====================================================

import { Router } from 'express';
import medicalRecordController from '../controllers/medicalRecord.controller.js';
import fileController from '../controllers/file.controller.js';
import { authenticate, authorize, checkPatientAccess } from '../middleware/auth.middleware.js';
import { upload } from '../config/multer.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// =====================================================
// RUTAS DE REGISTROS MÉDICOS
// =====================================================

// Crear nuevo registro médico
router.post(
  '/',
  authorize('doctor', 'admin'),
  medicalRecordController.createRecord
);

// Obtener registros de un paciente
router.get(
  '/patient/:patientId',
  checkPatientAccess,
  medicalRecordController.getPatientRecords
);

// Obtener estadísticas de un paciente
router.get(
  '/patient/:patientId/stats',
  checkPatientAccess,
  medicalRecordController.getPatientStats
);

// Obtener un registro específico
router.get(
  '/:id',
  medicalRecordController.getRecordById
);

// Actualizar registro médico
router.put(
  '/:id',
  authorize('doctor', 'admin'),
  medicalRecordController.updateRecord
);

// Eliminar registro médico (solo admin)
router.delete(
  '/:id',
  authorize('admin'),
  medicalRecordController.deleteRecord
);

// =====================================================
// RUTAS DE ARCHIVOS
// =====================================================

// Subir archivo a un registro
router.post(
  '/:recordId/file',
  authorize('doctor', 'admin'),
  upload.single('file'),
  fileController.uploadFile
);

// Obtener archivos de un registro
router.get(
  '/:recordId/files',
  fileController.getRecordFiles
);

// Descargar archivo
router.get(
  '/file/:fileId/download',
  fileController.downloadFile
);

// Eliminar archivo
router.delete(
  '/file/:fileId',
  authorize('doctor', 'admin'),
  fileController.deleteFile
);

export default router;
