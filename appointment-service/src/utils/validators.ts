import { body, query, param } from 'express-validator';
import { AppointmentStatus, AppointmentType } from '../models/Appointment.js';

// Validaciones para crear cita
export const validateCreateAppointment = [
  body('patientId')
    .isMongoId()
    .withMessage('ID de paciente inválido'),
  
  body('doctorId')
    .isMongoId()
    .withMessage('ID de doctor inválido'),
  
  body('facilityId')
    .optional()
    .isMongoId()
    .withMessage('ID de instalación inválido'),
  
  body('appointmentDate')
    .isISO8601()
    .withMessage('Fecha de cita inválida')
    .custom((value: string) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('La fecha de la cita debe ser hoy o en el futuro');
      }
      
      // No permitir citas con más de 1 año de anticipación
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (appointmentDate > maxDate) {
        throw new Error('No se pueden programar citas con más de 1 año de anticipación');
      }
      
      return true;
    }),
  
  body('startTime')
    .isISO8601()
    .withMessage('Hora de inicio inválida')
    .custom((value: string, { req }: { req: any }) => {
      const startTime = new Date(value);
      const appointmentDate = new Date(req.body.appointmentDate);
      
      // Verificar que la hora de inicio sea el mismo día que la fecha de la cita
      if (
        startTime.getFullYear() !== appointmentDate.getFullYear() ||
        startTime.getMonth() !== appointmentDate.getMonth() ||
        startTime.getDate() !== appointmentDate.getDate()
      ) {
        throw new Error('La hora de inicio debe ser el mismo día que la fecha de la cita');
      }
      
      // Verificar horario laboral (8 AM - 8 PM)
      const hours = startTime.getHours();
      if (hours < 8 || hours >= 20) {
        throw new Error('Las citas solo pueden programarse entre las 8:00 AM y 8:00 PM');
      }
      
      return true;
    }),
  
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
  
  body('type')
    .optional()
    .isIn(Object.values(AppointmentType))
    .withMessage(`Tipo de cita debe ser uno de: ${Object.values(AppointmentType).join(', ')}`),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('El motivo de la cita es requerido')
    .isLength({ min: 5, max: 500 })
    .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
  
  body('specialization')
    .trim()
    .notEmpty()
    .withMessage('La especialización es requerida')
    .isLength({ max: 100 })
    .withMessage('La especialización no puede exceder 100 caracteres'),
  
  body('baseFee')
    .isFloat({ min: 0 })
    .withMessage('La tarifa base debe ser un número positivo'),
  
  body('isVirtual')
    .optional()
    .isBoolean()
    .withMessage('isVirtual debe ser un booleano'),
  
  body('insuranceCovered')
    .optional()
    .isBoolean()
    .withMessage('insuranceCovered debe ser un booleano'),
  
  body('insuranceProvider')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El proveedor de seguro no puede exceder 100 caracteres'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres'),
];

// Validaciones para actualizar cita
export const validateUpdateAppointment = [
  param('id')
    .isMongoId()
    .withMessage('ID de cita inválido'),
  
  body('appointmentDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de cita inválida')
    .custom((value: string) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('La fecha de la cita debe ser hoy o en el futuro');
      }
      
      return true;
    }),
  
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Hora de inicio inválida')
    .custom((value: string, { req }: { req: any }) => {
      const startTime = new Date(value);
      
      // Verificar horario laboral
      const hours = startTime.getHours();
      if (hours < 8 || hours >= 20) {
        throw new Error('Las citas solo pueden programarse entre las 8:00 AM y 8:00 PM');
      }
      
      // Si se proporciona appointmentDate, verificar consistencia
      if (req.body.appointmentDate) {
        const appointmentDate = new Date(req.body.appointmentDate);
        if (
          startTime.getFullYear() !== appointmentDate.getFullYear() ||
          startTime.getMonth() !== appointmentDate.getMonth() ||
          startTime.getDate() !== appointmentDate.getDate()
        ) {
          throw new Error('La hora de inicio debe ser el mismo día que la fecha de la cita');
        }
      }
      
      return true;
    }),
  
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
  
  body('reason')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El motivo no puede estar vacío')
    .isLength({ min: 5, max: 500 })
    .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres'),
  
  body('status')
    .optional()
    .isIn(Object.values(AppointmentStatus))
    .withMessage(`Estado debe ser uno de: ${Object.values(AppointmentStatus).join(', ')}`),
  
  body('isVirtual')
    .optional()
    .isBoolean()
    .withMessage('isVirtual debe ser un booleano'),
  
  body('meetingLink')
    .optional()
    .trim()
    .custom((value: string, { req }: { req: any }) => {
      // Si es virtual, debe tener link
      if (req.body.isVirtual === true && !value) {
        throw new Error('Link de reunión es requerido para citas virtuales');
      }
      
      // Si tiene link, debe ser una URL válida
      if (value) {
        try {
          new URL(value);
        } catch {
          throw new Error('Link de reunión inválido');
        }
      }
      
      return true;
    }),
];

// Validaciones para cancelar cita
export const validateCancelAppointment = [
  param('id')
    .isMongoId()
    .withMessage('ID de cita inválido'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('El motivo de cancelación es requerido')
    .isLength({ min: 5, max: 500 })
    .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
];

// Validaciones para reagendar cita
export const validateRescheduleAppointment = [
  param('id')
    .isMongoId()
    .withMessage('ID de cita inválido'),
  
  body('newStartTime')
    .isISO8601()
    .withMessage('Nueva hora de inicio inválida')
    .custom((value: string) => {
      const startTime = new Date(value);
      const now = new Date();
      
      // Debe ser en el futuro
      if (startTime <= now) {
        throw new Error('La nueva fecha y hora deben ser en el futuro');
      }
      
      // Verificar horario laboral
      const hours = startTime.getHours();
      if (hours < 8 || hours >= 20) {
        throw new Error('Las citas solo pueden programarse entre las 8:00 AM y 8:00 PM');
      }
      
      return true;
    }),
  
  body('newDuration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres'),
];

// Validaciones para obtener citas con filtros
export const validateGetAppointments = [
  query('patientId')
    .optional()
    .isMongoId()
    .withMessage('ID de paciente inválido'),
  
  query('doctorId')
    .optional()
    .isMongoId()
    .withMessage('ID de doctor inválido'),
  
  query('facilityId')
    .optional()
    .isMongoId()
    .withMessage('ID de instalación inválido'),
  
  query('status')
    .optional()
    .custom((value: string | string[]) => {
      const statuses = Array.isArray(value) ? value : [value];
      const validStatuses = Object.values(AppointmentStatus);
      
      for (const status of statuses) {
        if (!validStatuses.includes(status as AppointmentStatus)) {
          throw new Error(`Estado inválido: ${status}. Debe ser uno de: ${validStatuses.join(', ')}`);
        }
      }
      
      return true;
    }),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde inválida'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta inválida')
    .custom((value: string, { req }: { req: any }) => {
      if (req.query.dateFrom && value) {
        const dateFrom = new Date(req.query.dateFrom as string);
        const dateTo = new Date(value);
        
        if (dateTo < dateFrom) {
          throw new Error('La fecha hasta debe ser posterior a la fecha desde');
        }
      }
      
      return true;
    }),
  
  query('type')
    .optional()
    .isIn(Object.values(AppointmentType))
    .withMessage(`Tipo debe ser uno de: ${Object.values(AppointmentType).join(', ')}`),
  
  query('isVirtual')
    .optional()
    .isBoolean()
    .withMessage('isVirtual debe ser true o false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  query('sortBy')
    .optional()
    .isIn(['appointmentDate', 'startTime', 'createdAt', 'status', 'type'])
    .withMessage('Campo de ordenamiento inválido'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Orden debe ser asc o desc'),
];

// Validaciones para obtener slots disponibles
export const validateGetAvailableSlots = [
  query('doctorId')
    .notEmpty()
    .withMessage('ID del doctor es requerido')
    .isMongoId()
    .withMessage('ID del doctor inválido'),
  
  query('date')
    .notEmpty()
    .withMessage('Fecha es requerida')
    .isISO8601()
    .withMessage('Fecha inválida')
    .custom((value: string) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        throw new Error('La fecha debe ser hoy o en el futuro');
      }
      
      // No permitir consultar con más de 6 meses de anticipación
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      
      if (date > maxDate) {
        throw new Error('No se pueden consultar slots con más de 6 meses de anticipación');
      }
      
      return true;
    }),
  
  query('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
];

// Validaciones para parámetro ID
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido'),
];