import { Request, Response, NextFunction } from 'express';
import { invoiceService } from '../services/invoice.service.js';
import { externalService } from '../services/external.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { logger } from '../utils/logger.js';

export class InvoiceController {
  /**
   * Crear factura
   */
  async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoice = await invoiceService.createInvoice({
        ...req.body,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Factura creada exitosamente',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crear factura desde cita completada
   */
  async createInvoiceFromAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.userId;
      const token = req.headers.authorization!.substring(7);

      const invoice = await invoiceService.createInvoiceFromAppointment(
        appointmentId,
        userId,
        token
      );

      if (!invoice) {
        throw new AppError(400, 'No se pudo crear la factura desde la cita');
      }

      res.status(201).json({
        success: true,
        message: 'Factura creada desde cita exitosamente',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener factura por ID
   */
  async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);

      if (!invoice) {
        throw new AppError(404, 'Factura no encontrada');
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar facturas
   */
  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        patientId: req.query.patientId as string,
        doctorId: req.query.doctorId as string,
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await invoiceService.getInvoices(filters);

      res.json({
        success: true,
        data: result.invoices,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Emitir factura
   */
  async issueInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const invoice = await invoiceService.issueInvoice(id, userId);

      res.json({
        success: true,
        message: 'Factura emitida exitosamente',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar factura
   */
  async updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.updateInvoice(id, req.body);

      res.json({
        success: true,
        message: 'Factura actualizada exitosamente',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancelar factura
   */
  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.userId;

      const invoice = await invoiceService.cancelInvoice(id, userId, reason);

      res.json({
        success: true,
        message: 'Factura cancelada exitosamente',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Descargar factura en PDF
   */
  async downloadInvoicePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice) {
        throw new AppError(404, 'Factura no encontrada');
      }

      const pdf = await generateInvoicePDF(invoice);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`);
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enviar factura por email
   */
  async sendInvoiceEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const token = req.headers.authorization!.substring(7);

      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice) {
        throw new AppError(404, 'Factura no encontrada');
      }

      // Obtener información del paciente
      const patient = await externalService.getUser(
        invoice.patientId.toString(),
        token
      );

      if (!patient || !patient.email) {
        throw new AppError(400, 'No se pudo obtener email del paciente');
      }

      // Generar PDF y enviar usando servicio externo
      const pdf = await generateInvoicePDF(invoice, { name: `${patient.firstName} ${patient.lastName}`, email: patient.email });
      await externalService.sendInvoiceEmail(patient.email, invoice.invoiceNumber, pdf, token);

      res.json({
        success: true,
        message: 'Factura enviada por email exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
