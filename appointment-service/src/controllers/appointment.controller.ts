import type { Request, Response } from 'express';
import { AppointmentService, type CreateAppointmentInput, type UpdateAppointmentInput } from '../services/appointment.service.js';
import { AppointmentStatus, AppointmentType } from '../models/Appointment.js';
import { logger } from '../utils/logger.js';
import { validationResult } from 'express-validator';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  /**
   * Crear nueva cita
   */
  async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      const appointmentData: CreateAppointmentInput = {
        ...req.body,
        appointmentDate: new Date(req.body.appointmentDate),
        startTime: new Date(req.body.startTime),
        createdBy: userId,
      };

      const appointment = await this.appointmentService.createAppointment(appointmentData);

      res.status(201).json({
        message: 'Cita creada exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en createAppointment:', error);
      
      if (error.message.includes('ya tiene una cita programada')) {
        res.status(409).json({ error: error.message });
        return;
      }
      
      if (error.message.includes('no está disponible')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener citas con filtros y paginación
   */
  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const {
        patientId,
        doctorId,
        facilityId,
        status,
        dateFrom,
        dateTo,
        specialization,
        type,
        isVirtual,
        page = 1,
        limit = 10,
        sortBy = 'appointmentDate',
        sortOrder = 'asc'
      } = req.query;

      const filters = {
        ...(patientId && { patientId: patientId as string }),
        ...(doctorId && { doctorId: doctorId as string }),
        ...(facilityId && { facilityId: facilityId as string }),
        ...(status && { status: Array.isArray(status) ? status as AppointmentStatus[] : status as AppointmentStatus }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        ...(specialization && { specialization: specialization as string }),
        ...(type && { type: type as AppointmentType }),
        ...(isVirtual !== undefined && { isVirtual: isVirtual === 'true' }),
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.appointmentService.getAppointments(filters, pagination);

      res.json({
        message: 'Citas obtenidas exitosamente',
        ...result,
      });
    } catch (error: any) {
      logger.error('Error en getAppointments:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener cita por ID
   */
  async getAppointmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'ID de cita requerido' });
        return;
      }

      const appointment = await this.appointmentService.getAppointmentById(id);

      if (!appointment) {
        res.status(404).json({ error: 'Cita no encontrada' });
        return;
      }

      res.json({
        message: 'Cita obtenida exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en getAppointmentById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Actualizar cita
   */
  async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      const updates: UpdateAppointmentInput = {
        ...req.body,
        ...(req.body.appointmentDate && { appointmentDate: new Date(req.body.appointmentDate) }),
        ...(req.body.startTime && { startTime: new Date(req.body.startTime) }),
      };

      const appointment = await this.appointmentService.updateAppointment(id, updates, userId);

      if (!appointment) {
        res.status(404).json({ error: 'Cita no encontrada' });
        return;
      }

      res.json({
        message: 'Cita actualizada exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en updateAppointment:', error);

      if (error.message.includes('no puede ser modificada')) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message.includes('ya tiene una cita programada')) {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Cancelar cita
   */
  async cancelAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Motivo de cancelación es requerido' });
        return;
      }

      const appointment = await this.appointmentService.cancelAppointment(id, reason, userId);

      if (!appointment) {
        res.status(404).json({ error: 'Cita no encontrada' });
        return;
      }

      res.json({
        message: 'Cita cancelada exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en cancelAppointment:', error);

      if (error.message.includes('no puede ser cancelada')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Reagendar cita
   */
  async rescheduleAppointment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { newStartTime, newDuration, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      if (!newStartTime) {
        res.status(400).json({ error: 'Nueva fecha y hora son requeridas' });
        return;
      }

      const appointment = await this.appointmentService.rescheduleAppointment(
        id,
        new Date(newStartTime),
        newDuration,
        reason,
        userId
      );

      if (!appointment) {
        res.status(404).json({ error: 'Cita no encontrada' });
        return;
      }

      res.json({
        message: 'Cita reagendada exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en rescheduleAppointment:', error);

      if (error.message.includes('no puede ser reagendada')) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message.includes('ya tiene una cita programada')) {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Confirmar cita
   */
  async confirmAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      const appointment = await this.appointmentService.confirmAppointment(id, userId);

      if (!appointment) {
        res.status(404).json({ error: 'Cita no encontrada' });
        return;
      }

      res.json({
        message: 'Cita confirmada exitosamente',
        appointment,
      });
    } catch (error: any) {
      logger.error('Error en confirmAppointment:', error);

      if (error.message.includes('Solo las citas programadas')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener slots disponibles
   */
  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId, date, duration = 30 } = req.query;

      if (!doctorId || !date) {
        res.status(400).json({ 
          error: 'doctorId y date son parámetros requeridos' 
        });
        return;
      }

      const appointmentDate = new Date(date as string);
      const appointmentDuration = parseInt(duration as string, 10);

      const slots = await this.appointmentService.getAvailableSlots(
        doctorId as string,
        appointmentDate,
        appointmentDuration
      );

      res.json({
        message: 'Slots disponibles obtenidos exitosamente',
        date: appointmentDate,
        duration: appointmentDuration,
        availableSlots: slots,
        totalSlots: slots.length,
      });
    } catch (error: any) {
      logger.error('Error en getAvailableSlots:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener estadísticas de citas
   */
  async getAppointmentStats(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId, dateFrom, dateTo } = req.query;

      const filters: any = {};
      
      if (doctorId) {
        filters.doctorId = doctorId as string;
      }
      
      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom as string);
      }
      
      if (dateTo) {
        filters.dateTo = new Date(dateTo as string);
      }

      // Obtener todas las citas sin paginación
      const { appointments } = await this.appointmentService.getAppointments(
        filters,
        { page: 1, limit: 1000000 } // Obtener todas
      );

      // Calcular estadísticas
      const stats = {
        total: appointments.length,
        byStatus: {
          scheduled: appointments.filter(apt => apt.status === AppointmentStatus.SCHEDULED).length,
          confirmed: appointments.filter(apt => apt.status === AppointmentStatus.CONFIRMED).length,
          inProgress: appointments.filter(apt => apt.status === AppointmentStatus.IN_PROGRESS).length,
          completed: appointments.filter(apt => apt.status === AppointmentStatus.COMPLETED).length,
          cancelled: appointments.filter(apt => apt.status === AppointmentStatus.CANCELLED).length,
          noShow: appointments.filter(apt => apt.status === AppointmentStatus.NO_SHOW).length,
        },
        byType: {
          consultation: appointments.filter(apt => apt.type === AppointmentType.CONSULTATION).length,
          followUp: appointments.filter(apt => apt.type === AppointmentType.FOLLOW_UP).length,
          checkup: appointments.filter(apt => apt.type === AppointmentType.CHECKUP).length,
          emergency: appointments.filter(apt => apt.type === AppointmentType.EMERGENCY).length,
          teleconsultation: appointments.filter(apt => apt.type === AppointmentType.TELECONSULTATION).length,
        },
        virtual: appointments.filter(apt => apt.isVirtual).length,
        inPerson: appointments.filter(apt => !apt.isVirtual).length,
      };

      res.json({
        message: 'Estadísticas obtenidas exitosamente',
        stats,
        period: {
          from: filters.dateFrom,
          to: filters.dateTo,
        },
      });
    } catch (error: any) {
      logger.error('Error en getAppointmentStats:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}