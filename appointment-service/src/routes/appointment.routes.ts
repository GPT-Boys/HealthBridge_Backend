import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticateToken, authorizeRoles, authorizeAppointmentAccess } from '../middleware/auth.middleware.js';
import {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateCancelAppointment,
  validateRescheduleAppointment,
  validateGetAppointments,
  validateGetAvailableSlots,
  validateId
} from '../utils/validators.js';

const router = Router();
const appointmentController = new AppointmentController();

// ==============================================
// RUTAS PÚBLICAS (Solo para consultar disponibilidad)
// ==============================================

/**
 * GET /api/appointments/slots/available
 * Obtener slots disponibles para un doctor en una fecha específica
 */
router.get('/slots/available', 
  validateGetAvailableSlots,
  appointmentController.getAvailableSlots.bind(appointmentController)
);

// ==============================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ==============================================

/**
 * POST /api/appointments
 * Crear nueva cita médica
 * Acceso: Pacientes, Doctores, Administradores
 */
router.post('/',
  authenticateToken,
  authorizeRoles('patient', 'doctor', 'admin'),
  validateCreateAppointment,
  appointmentController.createAppointment.bind(appointmentController)
);

/**
 * GET /api/appointments
 * Obtener citas con filtros y paginación
 * Acceso: Todos los roles autenticados (con restricciones por rol)
 */
router.get('/',
  authenticateToken,
  authorizeAppointmentAccess,
  validateGetAppointments,
  appointmentController.getAppointments.bind(appointmentController)
);

/**
 * GET /api/appointments/stats
 * Obtener estadísticas de citas
 * Acceso: Doctores (sus citas), Administradores (todas)
 */
router.get('/stats',
  authenticateToken,
  authorizeRoles('doctor', 'admin'),
  appointmentController.getAppointmentStats.bind(appointmentController)
);

/**
 * GET /api/appointments/:id
 * Obtener cita específica por ID
 * Acceso: Propietarios de la cita y administradores
 */
router.get('/:id',
  authenticateToken,
  validateId,
  appointmentController.getAppointmentById.bind(appointmentController)
);

/**
 * PUT /api/appointments/:id
 * Actualizar cita médica
 * Acceso: Doctores (sus citas), Pacientes (sus citas), Administradores
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('patient', 'doctor', 'admin'),
  validateUpdateAppointment,
  appointmentController.updateAppointment.bind(appointmentController)
);

/**
 * POST /api/appointments/:id/cancel
 * Cancelar cita médica
 * Acceso: Pacientes (sus citas), Doctores (sus citas), Administradores
 */
router.post('/:id/cancel',
  authenticateToken,
  authorizeRoles('patient', 'doctor', 'admin'),
  validateCancelAppointment,
  appointmentController.cancelAppointment.bind(appointmentController)
);

/**
 * POST /api/appointments/:id/reschedule
 * Reagendar cita médica
 * Acceso: Pacientes (sus citas), Doctores (sus citas), Administradores
 */
router.post('/:id/reschedule',
  authenticateToken,
  authorizeRoles('patient', 'doctor', 'admin'),
  validateRescheduleAppointment,
  appointmentController.rescheduleAppointment.bind(appointmentController)
);

/**
 * POST /api/appointments/:id/confirm
 * Confirmar cita médica
 * Acceso: Doctores, Administradores
 */
router.post('/:id/confirm',
  authenticateToken,
  authorizeRoles('doctor', 'admin'),
  validateId,
  appointmentController.confirmAppointment.bind(appointmentController)
);

// ==============================================
// RUTAS ADMINISTRATIVAS
// ==============================================

/**
 * Middleware para rutas administrativas
 */
const adminOnly = [authenticateToken, authorizeRoles('admin')];

// Aquí se pueden agregar más rutas administrativas específicas en el futuro
// Por ejemplo: reportes avanzados, configuraciones globales, etc.

export default router;