import { Request, Response, NextFunction } from 'express';
import { Invoice, InvoiceStatus } from '../models/Invoice.js';
import { AppError } from '../middleware/error.middleware.js';

class ReportController {
  /**
   * Reporte financiero general (ya implementado)
   */
  async financialReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dateFrom, dateTo, doctorId, facilityId, groupBy } = req.query as Record<string, string>;
      const match: any = {
        issueDate: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo),
        },
      };
      if (doctorId) match.doctorId = doctorId;
      if (facilityId) match.facilityId = facilityId;

      const invoices = await Invoice.find(match);
      const totalFacturado = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPagado = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      const totalPendiente = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

      res.json({
        success: true,
        data: {
          totalFacturado,
          totalPagado,
          totalPendiente,
          cantidadFacturas: invoices.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reporte financiero por doctor
   */
  async doctorReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId } = req.params;
      const { dateFrom, dateTo } = req.query as Record<string, string>;
      if (!doctorId) throw new AppError(400, 'doctorId requerido');
      const match: any = { doctorId };
      if (dateFrom || dateTo) {
        match.issueDate = {};
        if (dateFrom) match.issueDate.$gte = new Date(dateFrom);
        if (dateTo) match.issueDate.$lte = new Date(dateTo);
      }
      const invoices = await Invoice.find(match);
      const totalFacturado = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPagado = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      const totalPendiente = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
      res.json({
        success: true,
        data: {
          doctorId,
          totalFacturado,
          totalPagado,
          totalPendiente,
          cantidadFacturas: invoices.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reporte financiero por paciente
   */
  async patientReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId } = req.params;
      const { dateFrom, dateTo } = req.query as Record<string, string>;
      if (!patientId) throw new AppError(400, 'patientId requerido');
      const match: any = { patientId };
      if (dateFrom || dateTo) {
        match.issueDate = {};
        if (dateFrom) match.issueDate.$gte = new Date(dateFrom);
        if (dateTo) match.issueDate.$lte = new Date(dateTo);
      }
      const invoices = await Invoice.find(match);
      const totalFacturado = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPagado = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      const totalPendiente = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
      res.json({
        success: true,
        data: {
          patientId,
          totalFacturado,
          totalPagado,
          totalPendiente,
          cantidadFacturas: invoices.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reporte de cuentas por cobrar (facturas vencidas o pendientes)
   */
  async pendingInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const match = {
        $or: [
          { status: InvoiceStatus.OVERDUE },
          { status: InvoiceStatus.ISSUED, dueDate: { $lt: now } },
          { status: InvoiceStatus.PARTIALLY_PAID, dueDate: { $lt: now } },
        ],
      };
      const invoices = await Invoice.find(match);
      const totalPendiente = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
      res.json({
        success: true,
        data: {
          totalPendiente,
          cantidadFacturas: invoices.length,
          facturas: invoices,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
