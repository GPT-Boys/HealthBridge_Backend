import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice.js';

export const generateInvoicePDF = async (
  invoice: IInvoice,
  patient?: { name?: string; email?: string },
  doctor?: { name?: string }
): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Encabezado
    doc
      .fontSize(20)
      .text('HealthBridge', { align: 'right' })
      .moveDown(0.2)
      .fontSize(10)
      .text('Servicio de Facturación y Pagos', { align: 'right' })
      .moveDown();

    // Info factura
    doc
      .fontSize(16)
      .text(`Factura ${invoice.invoiceNumber}`)
      .moveDown(0.5)
      .fontSize(10)
      .text(`Fecha de emisión: ${new Date(invoice.issueDate).toLocaleDateString()}`)
      .text(`Fecha de vencimiento: ${new Date(invoice.dueDate).toLocaleDateString()}`)
      .moveDown();

    // Info paciente y doctor
    doc
      .fontSize(12)
      .text('Paciente:', { continued: true })
      .font('Helvetica-Bold')
      .text(` ${patient?.name || invoice.patientId.toString()}`)
      .font('Helvetica')
      .text(`Email: ${patient?.email || '-'}`)
      .moveDown(0.5)
      .text('Doctor:', { continued: true })
      .font('Helvetica-Bold')
      .text(` ${doctor?.name || (invoice.doctorId ? invoice.doctorId.toString() : '-')}`)
      .font('Helvetica')
      .moveDown();

    // Tabla de items
    doc.fontSize(12).text('Items', { underline: true }).moveDown(0.5);
    const tableTop = doc.y;
    const rowHeight = 20;
    const colX = { desc: 50, qty: 300, unit: 360, subtotal: 440 };

    doc.font('Helvetica-Bold');
    doc.text('Descripción', colX.desc, tableTop);
    doc.text('Cant.', colX.qty, tableTop);
    doc.text('Precio', colX.unit, tableTop);
    doc.text('Subtotal', colX.subtotal, tableTop);
    doc.moveDown();
    doc.font('Helvetica');

    invoice.items.forEach((item, idx) => {
      const y = tableTop + rowHeight * (idx + 1);
      doc.text(item.description, colX.desc, y, { width: 230 });
      doc.text(String(item.quantity), colX.qty, y);
      doc.text(item.unitPrice.toFixed(2), colX.unit, y);
      doc.text(item.subtotal.toFixed(2), colX.subtotal, y);
    });

    doc.moveDown(2);

    // Resumen
    const summaryX = 360;
    doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, summaryX);
    doc.text(`Descuento: ${invoice.discountAmount.toFixed(2)}`, summaryX);
    doc.text(`Cobertura Seguro: ${invoice.insuranceCoverage.toFixed(2)}`, summaryX);
    doc.font('Helvetica-Bold').text(`Total: ${invoice.totalAmount.toFixed(2)}`, summaryX);
    doc.font('Helvetica').text(`Pagado: ${invoice.amountPaid.toFixed(2)}`, summaryX);
    doc.text(`Saldo: ${invoice.amountDue.toFixed(2)}`, summaryX);

    if (invoice.hasInsurance && invoice.insuranceInfo) {
      doc.moveDown(1);
      doc.text(`Seguro: ${invoice.insuranceInfo.provider} (${invoice.insuranceInfo.coveragePercentage}% cobertura)`);
      if (invoice.insuranceInfo.policyNumber) {
        doc.text(`Póliza: ${invoice.insuranceInfo.policyNumber}`);
      }
    }

    doc.moveDown(2).fontSize(9).text('Gracias por su confianza en HealthBridge.');

    doc.end();
  });
};
