import axios from 'axios';
import ENV from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface IAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId?: string;
  appointmentDate: Date;
  startTime: Date;
  duration: number;
  type: string;
  status: string;
  reason: string;
  baseFee: number;
  insuranceCovered: boolean;
  insuranceProvider?: string;
  finalCost?: number;
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profile?: {
    phone?: string;
    address?: string;
  };
}

export interface ISubscription {
  id: string;
  userId: string;
  planType: string;
  status: string;
  price: number;
}

class ExternalService {
  /**
   * Obtener detalles de una cita
   */
  async getAppointment(appointmentId: string, token: string): Promise<IAppointment | null> {
    try {
      const response = await axios.get(
        `${ENV.APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      
      return response.data.data;
    } catch (error: any) {
      logger.error('Error al obtener cita:', error.message);
      return null;
    }
  }

  /**
   * Obtener información de usuario
   */
  async getUser(userId: string, token: string): Promise<IUser | null> {
    try {
      const response = await axios.get(
        `${ENV.USER_SERVICE_URL}/api/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      
      return response.data.data;
    } catch (error: any) {
      logger.error('Error al obtener usuario:', error.message);
      return null;
    }
  }

  /**
   * Obtener suscripción de usuario
   */
  async getUserSubscription(userId: string, token: string): Promise<ISubscription | null> {
    try {
      const response = await axios.get(
        `${ENV.SUBSCRIPTION_SERVICE_URL}/api/subscriptions/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      
      return response.data.data;
    } catch (error: any) {
      logger.warn('Error al obtener suscripción:', error.message);
      return null;
    }
  }

  /**
   * Enviar factura por email
   */
  async sendInvoiceEmail(
    patientEmail: string,
    invoiceNumber: string,
    pdfBuffer: Buffer,
    token: string
  ): Promise<boolean> {
    try {
      await axios.post(
        `${ENV.NOTIFICATION_SERVICE_URL}/api/notifications/email`,
        {
          to: patientEmail,
          subject: `Factura ${invoiceNumber} - HealthBridge`,
          template: 'invoice',
          data: {
            invoiceNumber,
          },
          attachments: [
            {
              filename: `factura-${invoiceNumber}.pdf`,
              content: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      
      logger.info(`Factura ${invoiceNumber} enviada por email a ${patientEmail}`);
      return true;
    } catch (error: any) {
      logger.error('Error al enviar factura por email:', error.message);
      return false;
    }
  }

  /**
   * Enviar notificación de pago recibido
   */
  async sendPaymentNotification(
    patientEmail: string,
    amount: number,
    invoiceNumber: string,
    token: string
  ): Promise<boolean> {
    try {
      await axios.post(
        `${ENV.NOTIFICATION_SERVICE_URL}/api/notifications/email`,
        {
          to: patientEmail,
          subject: `Pago recibido - Factura ${invoiceNumber}`,
          template: 'payment_received',
          data: {
            amount,
            invoiceNumber,
            currency: 'BOB',
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      
      return true;
    } catch (error: any) {
      logger.error('Error al enviar notificación de pago:', error.message);
      return false;
    }
  }
}

export const externalService = new ExternalService();
