import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateFinancialReport } from '../utils/validators.js';

const router = Router();

router.use(authenticate);

router.get('/financial', authorize('admin'), validateFinancialReport, validateRequest, reportController.financialReport.bind(reportController));

// Reporte por doctor
router.get('/doctor/:doctorId', authorize('admin', 'doctor'), reportController.doctorReport.bind(reportController));

// Reporte por paciente
router.get('/patient/:patientId', authorize('admin', 'doctor', 'patient'), reportController.patientReport.bind(reportController));

// Cuentas por cobrar
router.get('/pending', authorize('admin', 'doctor'), reportController.pendingInvoices.bind(reportController));

export default router;
