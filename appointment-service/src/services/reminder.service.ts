import cron from 'node-cron';
import { Appointment, AppointmentStatus } from '../models/Appointment.js';
import { NotificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';
import ENV from '../config/env.js';

export class ReminderService {
  private notificationService: NotificationService;
  private isRunning: boolean = false;
  private cronJob: any;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Iniciar el servicio de recordatorios automáticos
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('El servicio de recordatorios ya está ejecutándose');
      return;
    }

    logger.info('Iniciando servicio de recordatorios automáticos');

    // Ejecutar cada 30 minutos
    this.cronJob = cron.schedule('*/30 * * * *', async () => {
      await this.processAppointmentReminders();
    });

    this.isRunning = true;
    logger.info('Servicio de recordatorios iniciado exitosamente');
  }

  /**
   * Detener el servicio de recordatorios
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.cronJob) {
      this.cronJob.destroy();
    }
    this.isRunning = false;
    logger.info('Servicio de recordatorios detenido');
  }

  /**
   * Procesar recordatorios de citas pendientes
   */
  async processAppointmentReminders(): Promise<void> {
    try {
      logger.info('Procesando recordatorios de citas...');

      const reminderHours = ENV.APPOINTMENT_REMINDER_HOURS;
      
      for (const hours of reminderHours) {
        await this.sendRemindersForTimeFrame(hours);
      }

      logger.info('Procesamiento de recordatorios completado');
    } catch (error) {
      logger.error('Error procesando recordatorios:', error);
    }
  }

  /**
   * Enviar recordatorios para un marco temporal específico
   */
  private async sendRemindersForTimeFrame(hours: number): Promise<void> {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      
      // Buscar citas que necesiten recordatorio en este marco temporal
      const appointments = await this.findAppointmentsNeedingReminder(reminderTime, hours);
      
      logger.info(`Encontradas ${appointments.length} citas para recordatorio de ${hours} horas`);

      for (const appointment of appointments) {
        await this.sendAppointmentReminders(appointment);
      }
    } catch (error) {
      logger.error(`Error enviando recordatorios para ${hours} horas:`, error);
    }
  }

  /**
   * Encontrar citas que necesitan recordatorio
   */
  private async findAppointmentsNeedingReminder(targetTime: Date, hoursAhead: number): Promise<any[]> {
    const startWindow = new Date(targetTime.getTime() - (15 * 60 * 1000)); // 15 min antes
    const endWindow = new Date(targetTime.getTime() + (15 * 60 * 1000));   // 15 min después

    return await Appointment.find({
      status: { 
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] 
      },
      startTime: {
        $gte: startWindow,
        $lte: endWindow
      },
      // No enviar recordatorio si ya se envió uno para esta ventana temporal
      [`remindersSent.${hoursAhead}h`]: { $exists: false }
    }).populate('patientId doctorId facilityId');
  }

  /**
   * Enviar recordatorios para una cita específica
   */
  private async sendAppointmentReminders(appointment: any): Promise<void> {
    try {
      const hoursUntilAppointment = Math.ceil(
        (appointment.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60)
      );

      const reminderTypes: Array<'email' | 'sms' | 'whatsapp'> = [];

      // Determinar tipos de recordatorio basados en configuración
      // Por ahora, enviar email por defecto
      reminderTypes.push('email');

      // Enviar recordatorios
      for (const type of reminderTypes) {
        const success = await this.notificationService.sendAppointmentReminder(appointment, type);
        
        await this.recordReminderSent(appointment._id, type, success);
        
        if (success) {
          logger.info(`Recordatorio ${type} enviado exitosamente`, {
            appointmentId: appointment._id,
            hoursAhead: hoursUntilAppointment
          });
        } else {
          logger.warn(`Fallo enviando recordatorio ${type}`, {
            appointmentId: appointment._id
          });
        }
      }
    } catch (error) {
      logger.error('Error enviando recordatorios para cita:', error);
    }
  }

  /**
   * Registrar que se envió un recordatorio
   */
  private async recordReminderSent(
    appointmentId: string, 
    type: 'email' | 'sms' | 'whatsapp', 
    success: boolean
  ): Promise<void> {
    try {
      await Appointment.findByIdAndUpdate(appointmentId, {
        $push: {
          remindersSent: {
            type,
            sentAt: new Date(),
            status: success ? 'sent' : 'failed'
          }
        }
      });
    } catch (error) {
      logger.error('Error registrando recordatorio enviado:', error);
    }
  }

  /**
   * Enviar recordatorio manual para una cita específica
   */
  async sendManualReminder(
    appointmentId: string, 
    reminderType: 'email' | 'sms' | 'whatsapp'
  ): Promise<boolean> {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId doctorId facilityId');

      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      if (![AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
        throw new Error('La cita debe estar programada o confirmada para enviar recordatorios');
      }

      // Verificar que la cita sea en el futuro
      if (appointment.startTime <= new Date()) {
        throw new Error('No se pueden enviar recordatorios para citas pasadas');
      }

      const success = await this.notificationService.sendAppointmentReminder(appointment, reminderType);
      
      if (success) {
        await this.recordReminderSent(appointmentId, reminderType, true);
        logger.info(`Recordatorio manual ${reminderType} enviado`, {
          appointmentId
        });
      }

      return success;
    } catch (error) {
      logger.error('Error enviando recordatorio manual:', error);
      throw error;
    }
  }

  /**
   * Obtener próximas citas que necesitarán recordatorios
   */
  async getUpcomingReminders(): Promise<any[]> {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      const appointments = await Appointment.find({
        status: { 
          $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] 
        },
        startTime: {
          $gte: now,
          $lte: next24Hours
        }
      })
      .populate('patientId', 'firstName lastName email profile.phone')
      .populate('doctorId', 'firstName lastName')
      .sort({ startTime: 1 });

      return appointments.map(apt => ({
        appointmentId: apt._id,
        patientName: `${(apt.patientId as any)?.firstName} ${(apt.patientId as any)?.lastName}`,
        doctorName: `${(apt.doctorId as any)?.firstName} ${(apt.doctorId as any)?.lastName}`,
        appointmentTime: apt.startTime,
        hoursUntil: Math.ceil((apt.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
        remindersSent: apt.remindersSent,
        status: apt.status
      }));
    } catch (error) {
      logger.error('Error obteniendo próximos recordatorios:', error);
      throw error;
    }
  }

  /**
   * Limpiar recordatorios antiguos (ejecutar periódicamente)
   */
  async cleanOldReminders(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await Appointment.updateMany(
        { 
          appointmentDate: { $lt: thirtyDaysAgo }
        },
        { 
          $set: { remindersSent: [] } 
        }
      );

      logger.info('Recordatorios antiguos limpiados');
    } catch (error) {
      logger.error('Error limpiando recordatorios antiguos:', error);
    }
  }
}