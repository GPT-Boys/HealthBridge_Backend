import { Appointment, AppointmentStatus, AppointmentType, type IAppointment } from '../models/Appointment.js';
import { Schedule, type ISchedule } from '../models/Schedule.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { NotificationService } from './notification.service.js';

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  facilityId?: string;
  appointmentDate: Date;
  startTime: Date;
  duration?: number;
  type?: AppointmentType;
  reason: string;
  specialization: string;
  baseFee: number;
  isVirtual?: boolean;
  insuranceCovered?: boolean;
  insuranceProvider?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateAppointmentInput {
  appointmentDate?: Date;
  startTime?: Date;
  duration?: number;
  reason?: string;
  notes?: string;
  status?: AppointmentStatus;
  isVirtual?: boolean;
  meetingLink?: string;
}

export interface AppointmentFilters {
  patientId?: string;
  doctorId?: string;
  facilityId?: string;
  status?: AppointmentStatus | AppointmentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  specialization?: string;
  type?: AppointmentType;
  isVirtual?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AppointmentService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Crear una nueva cita médica
   */
  async createAppointment(input: CreateAppointmentInput): Promise<IAppointment> {
    try {
      logger.info('Creando nueva cita', { 
        patientId: input.patientId, 
        doctorId: input.doctorId 
      });

      // Validar disponibilidad del doctor
      await this.validateDoctorAvailability(
        input.doctorId,
        input.startTime,
        input.duration || 30
      );

      // Calcular hora de fin
      const endTime = new Date(input.startTime);
      endTime.setMinutes(endTime.getMinutes() + (input.duration || 30));

      // Crear cita
      const appointment = new Appointment({
        ...input,
        patientId: new mongoose.Types.ObjectId(input.patientId),
        doctorId: new mongoose.Types.ObjectId(input.doctorId),
        facilityId: input.facilityId ? new mongoose.Types.ObjectId(input.facilityId) : undefined,
        createdBy: new mongoose.Types.ObjectId(input.createdBy),
        endTime,
        status: AppointmentStatus.SCHEDULED,
        type: input.type || AppointmentType.CONSULTATION,
        remindersSent: [],
      });

      const savedAppointment = await appointment.save();

      // Enviar notificación al paciente y doctor
      await this.notificationService.sendAppointmentCreatedNotification(savedAppointment);

      logger.info('Cita creada exitosamente', { 
        appointmentId: savedAppointment._id 
      });

      return savedAppointment;
    } catch (error: any) {
      logger.error('Error creando cita:', error);
      throw error;
    }
  }

  /**
   * Obtener citas con filtros y paginación
   */
  async getAppointments(
    filters: AppointmentFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<{
    appointments: IAppointment[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const query = this.buildFilterQuery(filters);
      
      const skip = (pagination.page - 1) * pagination.limit;
      const sortOptions = this.buildSortOptions(pagination);

      const [appointments, totalCount] = await Promise.all([
        Appointment.find(query)
          .populate('patientId', 'firstName lastName email profile.phone')
          .populate('doctorId', 'firstName lastName profile.specialization')
          .populate('facilityId', 'name address')
          .sort(sortOptions)
          .skip(skip)
          .limit(pagination.limit),
        Appointment.countDocuments(query)
      ]);

      return {
        appointments,
        totalCount,
        totalPages: Math.ceil(totalCount / pagination.limit),
        currentPage: pagination.page,
      };
    } catch (error: any) {
      logger.error('Error obteniendo citas:', error);
      throw error;
    }
  }

  /**
   * Obtener cita por ID
   */
  async getAppointmentById(id: string): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(id)
        .populate('patientId', 'firstName lastName email profile')
        .populate('doctorId', 'firstName lastName profile')
        .populate('facilityId', 'name address contact');

      return appointment;
    } catch (error: any) {
      logger.error('Error obteniendo cita por ID:', error);
      throw error;
    }
  }

  /**
   * Actualizar una cita
   */
  async updateAppointment(
    id: string, 
    updates: UpdateAppointmentInput,
    updatedBy: string
  ): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      // Validar si la cita puede ser modificada
      if (![AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
        throw new Error('La cita no puede ser modificada en su estado actual');
      }

      // Si se cambia el horario, validar disponibilidad
      if (updates.startTime && updates.startTime.getTime() !== appointment.startTime.getTime()) {
        await this.validateDoctorAvailability(
          appointment.doctorId.toString(),
          updates.startTime,
          updates.duration || appointment.duration,
          id
        );

        // Calcular nueva hora de fin
        if (updates.startTime) {
          const endTime = new Date(updates.startTime);
          endTime.setMinutes(endTime.getMinutes() + (updates.duration || appointment.duration));
          updates = { ...updates, endTime } as any;
        }
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        { 
          ...updates,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).populate('patientId doctorId facilityId');

      if (updatedAppointment) {
        await this.notificationService.sendAppointmentUpdatedNotification(updatedAppointment);
        
        logger.info('Cita actualizada', { 
          appointmentId: id,
          updatedBy 
        });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Error actualizando cita:', error);
      throw error;
    }
  }

  /**
   * Cancelar una cita
   */
  async cancelAppointment(
    id: string,
    reason: string,
    cancelledBy: string
  ): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (!appointment.canBeCancelled()) {
        throw new Error('La cita no puede ser cancelada. Debe cancelarse con al menos 2 horas de anticipación.');
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: AppointmentStatus.CANCELLED,
          cancelledBy: new mongoose.Types.ObjectId(cancelledBy),
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
        { new: true }
      ).populate('patientId doctorId facilityId');

      if (updatedAppointment) {
        await this.notificationService.sendAppointmentCancelledNotification(updatedAppointment);
        
        logger.info('Cita cancelada', { 
          appointmentId: id,
          reason,
          cancelledBy 
        });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Error cancelando cita:', error);
      throw error;
    }
  }

  /**
   * Reagendar una cita
   */
  async rescheduleAppointment(
    id: string,
    newStartTime: Date,
    newDuration?: number,
    reason?: string,
    rescheduledBy?: string
  ): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (!appointment.canBeRescheduled()) {
        throw new Error('La cita no puede ser reagendada. Debe reagendarse con al menos 4 horas de anticipación.');
      }

      const duration = newDuration || appointment.duration;
      
      // Validar disponibilidad en el nuevo horario
      await this.validateDoctorAvailability(
        appointment.doctorId.toString(),
        newStartTime,
        duration,
        id
      );

      const newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + duration);

      const oldStartTime = appointment.startTime;

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          appointmentDate: new Date(newStartTime.getFullYear(), newStartTime.getMonth(), newStartTime.getDate()),
          startTime: newStartTime,
          endTime: newEndTime,
          duration,
          rescheduledFrom: oldStartTime,
          rescheduledTo: newStartTime,
          reschedulingReason: reason,
          status: AppointmentStatus.SCHEDULED, // Resetear estado a programada
        },
        { new: true, runValidators: true }
      ).populate('patientId doctorId facilityId');

      if (updatedAppointment) {
        await this.notificationService.sendAppointmentRescheduledNotification(updatedAppointment);
        
        logger.info('Cita reagendada', { 
          appointmentId: id,
          from: oldStartTime,
          to: newStartTime,
          rescheduledBy 
        });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Error reagendando cita:', error);
      throw error;
    }
  }

  /**
   * Confirmar una cita
   */
  async confirmAppointment(id: string, confirmedBy: string): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (appointment.status !== AppointmentStatus.SCHEDULED) {
        throw new Error('Solo las citas programadas pueden ser confirmadas');
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: AppointmentStatus.CONFIRMED,
        },
        { new: true }
      ).populate('patientId doctorId facilityId');

      if (updatedAppointment) {
        await this.notificationService.sendAppointmentConfirmedNotification(updatedAppointment);
        
        logger.info('Cita confirmada', { 
          appointmentId: id,
          confirmedBy 
        });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Error confirmando cita:', error);
      throw error;
    }
  }

  /**
   * Obtener slots disponibles para un doctor en una fecha específica
   */
  async getAvailableSlots(
    doctorId: string, 
    date: Date, 
    duration: number = 30
  ): Promise<Array<{ startTime: Date; endTime: Date; }>> {
    try {
      // Obtener horario del doctor
      const schedule = await Schedule.findOne({ 
        doctorId: new mongoose.Types.ObjectId(doctorId),
        isActive: true 
      });

      if (!schedule) {
        return [];
      }

      if (!schedule.isAvailableOnDate(date)) {
        return [];
      }

      const availableTimeSlots = schedule.getAvailableSlots(date);
      const existingAppointments = await this.getDoctorAppointmentsForDate(doctorId, date);

      const slots = [];

      for (const timeSlot of availableTimeSlots) {
        const slotStart = this.parseTimeString(timeSlot.startTime, date);
        const slotEnd = this.parseTimeString(timeSlot.endTime, date);
        
        // Generar slots de la duración especificada
        let currentTime = new Date(slotStart);
        
        while (currentTime.getTime() + (duration * 60000) <= slotEnd.getTime()) {
          const slotEndTime = new Date(currentTime.getTime() + (duration * 60000));
          
          // Verificar si hay conflicto con citas existentes
          const hasConflict = existingAppointments.some(apt => {
            return (
              currentTime < apt.endTime && slotEndTime > apt.startTime
            );
          });

          if (!hasConflict) {
            slots.push({
              startTime: new Date(currentTime),
              endTime: new Date(slotEndTime)
            });
          }
          
          // Avanzar al siguiente slot considerando el buffer
          currentTime.setMinutes(
            currentTime.getMinutes() + 
            duration + 
            schedule.bufferTimeBetweenAppointments
          );
        }
      }

      return slots;
    } catch (error: any) {
      logger.error('Error obteniendo slots disponibles:', error);
      throw error;
    }
  }

  /**
   * Validar disponibilidad del doctor
   */
  private async validateDoctorAvailability(
    doctorId: string,
    startTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<void> {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    // Verificar horario del doctor
    const schedule = await Schedule.findOne({ 
      doctorId: new mongoose.Types.ObjectId(doctorId),
      isActive: true 
    });

    if (!schedule) {
      throw new Error('El doctor no tiene un horario configurado');
    }

    if (!schedule.isAvailableOnDate(startTime)) {
      throw new Error('El doctor no está disponible en esta fecha');
    }

    // Verificar conflictos con otras citas
    const query: any = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: { 
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] 
      },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    };

    if (excludeAppointmentId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeAppointmentId) };
    }

    const conflictingAppointment = await Appointment.findOne(query);

    if (conflictingAppointment) {
      throw new Error('El doctor ya tiene una cita programada en este horario');
    }
  }

  /**
   * Obtener citas de un doctor para una fecha específica
   */
  private async getDoctorAppointmentsForDate(
    doctorId: string, 
    date: Date
  ): Promise<IAppointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
      }
    }).sort({ startTime: 1 });
  }

  /**
   * Construir query para filtros
   */
  private buildFilterQuery(filters: AppointmentFilters): any {
    const query: any = {};

    if (filters.patientId) {
      query.patientId = new mongoose.Types.ObjectId(filters.patientId);
    }

    if (filters.doctorId) {
      query.doctorId = new mongoose.Types.ObjectId(filters.doctorId);
    }

    if (filters.facilityId) {
      query.facilityId = new mongoose.Types.ObjectId(filters.facilityId);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      query.appointmentDate = {};
      if (filters.dateFrom) {
        query.appointmentDate.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.appointmentDate.$lte = filters.dateTo;
      }
    }

    if (filters.specialization) {
      query.specialization = new RegExp(filters.specialization, 'i');
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (typeof filters.isVirtual === 'boolean') {
      query.isVirtual = filters.isVirtual;
    }

    return query;
  }

  /**
   * Construir opciones de ordenamiento
   */
  private buildSortOptions(pagination: PaginationOptions): any {
    const sortBy = pagination.sortBy || 'appointmentDate';
    const sortOrder = pagination.sortOrder === 'desc' ? -1 : 1;
    
    return { [sortBy]: sortOrder };
  }

  /**
   * Parsear string de tiempo a Date
   */
  private parseTimeString(timeString: string, date: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours || 0, minutes || 0, 0, 0);
    return result;
  }
}