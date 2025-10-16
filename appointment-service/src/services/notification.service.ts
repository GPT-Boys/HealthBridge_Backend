import type { IAppointment } from '../models/Appointment.js';
import { logger } from '../utils/logger.js';
import ENV from '../config/env.js';
import axios from 'axios';

export class NotificationService {
  private notificationServiceUrl: string;

  constructor() {
    this.notificationServiceUrl = ENV.NOTIFICATION_SERVICE_URL;
  }

  /**
   * Enviar notificación de cita creada
   */
  async sendAppointmentCreatedNotification(appointment: IAppointment): Promise<void> {
    try {
      const payload = {
        type: 'appointment_created',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        specialization: appointment.specialization,
        reason: appointment.reason,
      };

      await this.sendNotification(payload);
      
      logger.info('Notificación de cita creada enviada', { 
        appointmentId: appointment.id 
      });
    } catch (error) {
      logger.error('Error enviando notificación de cita creada:', error);
      // No lanzar error para no interrumpir el proceso principal
    }
  }

  /**
   * Enviar notificación de cita actualizada
   */
  async sendAppointmentUpdatedNotification(appointment: IAppointment): Promise<void> {
    try {
      const payload = {
        type: 'appointment_updated',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        status: appointment.status,
      };

      await this.sendNotification(payload);
      
      logger.info('Notificación de cita actualizada enviada', { 
        appointmentId: appointment.id 
      });
    } catch (error) {
      logger.error('Error enviando notificación de cita actualizada:', error);
    }
  }

  /**
   * Enviar notificación de cita cancelada
   */
  async sendAppointmentCancelledNotification(appointment: IAppointment): Promise<void> {
    try {
      const payload = {
        type: 'appointment_cancelled',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        cancellationReason: appointment.cancellationReason,
      };

      await this.sendNotification(payload);
      
      logger.info('Notificación de cita cancelada enviada', { 
        appointmentId: appointment.id 
      });
    } catch (error) {
      logger.error('Error enviando notificación de cita cancelada:', error);
    }
  }

  /**
   * Enviar notificación de cita reagendada
   */
  async sendAppointmentRescheduledNotification(appointment: IAppointment): Promise<void> {
    try {
      const payload = {
        type: 'appointment_rescheduled',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        oldStartTime: appointment.rescheduledFrom,
        newStartTime: appointment.startTime,
        newAppointmentDate: appointment.appointmentDate,
        reschedulingReason: appointment.reschedulingReason,
      };

      await this.sendNotification(payload);
      
      logger.info('Notificación de cita reagendada enviada', { 
        appointmentId: appointment.id 
      });
    } catch (error) {
      logger.error('Error enviando notificación de cita reagendada:', error);
    }
  }

  /**
   * Enviar notificación de cita confirmada
   */
  async sendAppointmentConfirmedNotification(appointment: IAppointment): Promise<void> {
    try {
      const payload = {
        type: 'appointment_confirmed',
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
      };

      await this.sendNotification(payload);
      
      logger.info('Notificación de cita confirmada enviada', { 
        appointmentId: appointment.id 
      });
    } catch (error) {
      logger.error('Error enviando notificación de cita confirmada:', error);
    }
  }

  /**
   * Enviar recordatorio de cita
   */
  async sendAppointmentReminder(
    appointment: IAppointment, 
    reminderType: 'email' | 'sms' | 'whatsapp'
  ): Promise<boolean> {
    try {
      const payload = {
        type: 'appointment_reminder',
        reminderType,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        specialization: appointment.specialization,
        reason: appointment.reason,
        isVirtual: appointment.isVirtual,
        meetingLink: appointment.meetingLink,
      };

      await this.sendNotification(payload);
      
      logger.info('Recordatorio de cita enviado', { 
        appointmentId: appointment.id,
        reminderType 
      });

      return true;
    } catch (error) {
      logger.error('Error enviando recordatorio de cita:', error);
      return false;
    }
  }

  /**
   * Enviar notificación al servicio de notificaciones
   */
  private async sendNotification(payload: any): Promise<void> {
    try {
      if (ENV.NODE_ENV === 'development' || ENV.NODE_ENV === 'test') {
        // En desarrollo, solo loggear
        logger.info('Notificación simulada:', payload);
        return;
      }

      await axios.post(`${this.notificationServiceUrl}/api/notifications/send`, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      logger.error('Error conectando con servicio de notificaciones:', error);
      throw error;
    }
  }
}