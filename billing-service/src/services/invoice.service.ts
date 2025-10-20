import { Invoice, IInvoice, InvoiceStatus, IInvoiceItem } from '../models/Invoice.js';
import { Transaction, TransactionType } from '../models/Transaction.js';
import { externalService } from './external.service.js';
import { logger } from '../utils/logger.js';
import ENV from '../config/env.js';

interface CreateInvoiceData {
  appointmentId?: string;
  patientId: string;
  doctorId?: string;
  facilityId?: string;
  items: IInvoiceItem[];
  discountPercentage?: number;
  hasInsurance?: boolean;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    coveragePercentage: number;
  };
  notes?: string;
  dueDate?: Date;
  createdBy: string;
}

class InvoiceService {
  /**
   * Generar número de factura único
   */
  private async generateInvoiceNumber(): Promise<string> {
    const prefix = ENV.INVOICE_PREFIX;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Contar facturas del mes actual
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const count = await Invoice.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });
    
    const sequence = (count + 1).toString().padStart(6, '0');
    return `${prefix}-${year}${month}-${sequence}`;
  }

  /**
   * Crear factura
   */
  async createInvoice(data: CreateInvoiceData): Promise<IInvoice> {
    try {
      const invoiceNumber = await this.generateInvoiceNumber();
      
      // Calcular fecha de vencimiento si no se proporciona
      const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
      
      // Procesar información de seguro si existe
      let insuranceInfo;
      if (data.hasInsurance && data.insuranceInfo) {
        const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const coverageAmount = (subtotal * data.insuranceInfo.coveragePercentage) / 100;
        const copayAmount = subtotal - coverageAmount;
        
        insuranceInfo = {
          ...data.insuranceInfo,
          coverageAmount,
          copayAmount,
          claimStatus: 'pending' as const,
        };
      }
      
      // Crear la factura
      const invoice = new Invoice({
        invoiceNumber,
        patientId: data.patientId,
        doctorId: data.doctorId,
        facilityId: data.facilityId,
        appointmentId: data.appointmentId,
        items: data.items,
        discountPercentage: data.discountPercentage || 0,
        hasInsurance: data.hasInsurance || false,
        insuranceInfo,
        status: InvoiceStatus.DRAFT,
        issueDate: new Date(),
        dueDate,
        currency: ENV.CURRENCY,
        notes: data.notes,
        createdBy: data.createdBy,
        statusHistory: [{
          status: InvoiceStatus.DRAFT,
          changedAt: new Date(),
          changedBy: data.createdBy,
        }],
      });
      
      // Calcular totales
      invoice.calculateTotals();
      await invoice.save();
      
      logger.info(`Factura creada: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Error al crear factura:', error.message);
      throw error;
    }
  }

  /**
   * Crear factura automática desde cita completada
   */
  async createInvoiceFromAppointment(
    appointmentId: string,
    createdBy: string,
    token: string
  ): Promise<IInvoice | null> {
    try {
      // Obtener información de la cita
      const appointment = await externalService.getAppointment(appointmentId, token);
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }
      
      if (appointment.status !== 'completed') {
        throw new Error('La cita debe estar completada para generar factura');
      }
      
      // Verificar si ya existe una factura para esta cita
      const existingInvoice = await Invoice.findOne({ appointmentId });
      if (existingInvoice) {
        logger.warn(`Ya existe factura para la cita ${appointmentId}`);
        return existingInvoice;
      }
      
      // Crear items de la factura
      const items: IInvoiceItem[] = [{
        description: `Consulta médica - ${appointment.type}`,
        quantity: 1,
        unitPrice: appointment.baseFee,
        subtotal: appointment.baseFee,
        category: 'consultation',
      }];
      
      // Información de seguro si aplica
      const invoiceData: CreateInvoiceData = {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        facilityId: appointment.facilityId,
        items,
        hasInsurance: appointment.insuranceCovered,
        createdBy,
      };
      
      if (appointment.insuranceCovered && appointment.insuranceProvider) {
        invoiceData.insuranceInfo = {
          provider: appointment.insuranceProvider,
          policyNumber: 'AUTO-GENERATED',
          coveragePercentage: 70, // Porcentaje por defecto
        };
      }
      
      const invoice = await this.createInvoice(invoiceData);
      
      // Emitir la factura automáticamente
      await this.issueInvoice((invoice as any)._id.toString(), createdBy);
      
      return invoice;
    } catch (error: any) {
      logger.error('Error al crear factura desde cita:', error.message);
      return null;
    }
  }

  /**
   * Emitir factura (cambiar estado de draft a issued)
   */
  async issueInvoice(invoiceId: string, userId: string): Promise<IInvoice> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Factura no encontrada');
      }
      
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new Error('Solo se pueden emitir facturas en estado borrador');
      }
      
      invoice.status = InvoiceStatus.ISSUED;
      invoice.statusHistory.push({
        status: InvoiceStatus.ISSUED,
        changedAt: new Date(),
        changedBy: userId as any,
      });
      
      await invoice.save();
      
      logger.info(`Factura emitida: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Error al emitir factura:', error.message);
      throw error;
    }
  }

  /**
   * Obtener factura por ID
   */
  async getInvoiceById(invoiceId: string): Promise<IInvoice | null> {
    try {
      return await Invoice.findById(invoiceId)
        .populate('patientId', 'firstName lastName email')
        .populate('doctorId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    } catch (error: any) {
      logger.error('Error al obtener factura:', error.message);
      throw error;
    }
  }

  /**
   * Listar facturas con filtros
   */
  async getInvoices(filters: {
    patientId?: string;
    doctorId?: string;
    status?: InvoiceStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    invoices: IInvoice[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      const query: any = {};
      
      if (filters.patientId) query.patientId = filters.patientId;
      if (filters.doctorId) query.doctorId = filters.doctorId;
      if (filters.status) query.status = filters.status;
      if (filters.dateFrom || filters.dateTo) {
        query.issueDate = {};
        if (filters.dateFrom) query.issueDate.$gte = filters.dateFrom;
        if (filters.dateTo) query.issueDate.$lte = filters.dateTo;
      }
      
      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .sort({ issueDate: -1 })
          .skip(skip)
          .limit(limit)
          .populate('patientId', 'firstName lastName email')
          .populate('doctorId', 'firstName lastName'),
        Invoice.countDocuments(query),
      ]);
      
      return {
        invoices,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error al listar facturas:', error.message);
      throw error;
    }
  }

  /**
   * Cancelar factura
   */
  async cancelInvoice(invoiceId: string, userId: string, reason: string): Promise<IInvoice> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Factura no encontrada');
      }
      
      if (!invoice.canBeCancelled()) {
        throw new Error('La factura no puede ser cancelada');
      }
      
      invoice.status = InvoiceStatus.CANCELLED;
      invoice.cancelledDate = new Date();
      invoice.cancellationReason = reason;
      invoice.statusHistory.push({
        status: InvoiceStatus.CANCELLED,
        changedAt: new Date(),
        changedBy: userId as any,
        reason,
      });
      
      await invoice.save();
      
      logger.info(`Factura cancelada: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Error al cancelar factura:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar factura (solo en estado draft)
   */
  async updateInvoice(
    invoiceId: string,
    updates: Partial<CreateInvoiceData>
  ): Promise<IInvoice> {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Factura no encontrada');
      }
      
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new Error('Solo se pueden actualizar facturas en estado borrador');
      }
      
      // Actualizar campos permitidos
      if (updates.items) invoice.items = updates.items;
      if (updates.discountPercentage !== undefined) invoice.discountPercentage = updates.discountPercentage;
      if (updates.notes) invoice.notes = updates.notes;
      if (updates.dueDate) invoice.dueDate = updates.dueDate;
      
      // Recalcular totales
      invoice.calculateTotals();
      await invoice.save();
      
      logger.info(`Factura actualizada: ${invoice.invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Error al actualizar factura:', error.message);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
