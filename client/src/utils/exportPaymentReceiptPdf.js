import { jsPDF } from 'jspdf';

import {
  METODOS_PAGO,
  formatMoney,
  getConceptLabel,
  getVehicleLabel,
} from '../components/clients/clientConstants.js';
import { BRAND_NAME, BRAND_SLUG } from '../constants/brand.js';

function getMetodoLabel(metodo) {
  return METODOS_PAGO.find((m) => m.value === metodo)?.label ?? metodo;
}

function formatReceiptDate(dateString) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString || Date.now()));
}

function writeRow(doc, label, value, y, { bold = false } = {}) {
  doc.setFontSize(10);
  doc.setFont(undefined, bold ? 'bold' : 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(label, 18, y);
  doc.setTextColor(15, 23, 42);
  doc.text(String(value), 196, y, { align: 'right', maxWidth: 110 });
  return y + 8;
}

function writeSectionTitle(doc, title, y) {
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(10, 25, 38);
  doc.text(title, 14, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2);
  return y + 10;
}

/**
 * Genera y descarga un recibo de pago en PDF.
 */
export function downloadPaymentReceiptPdf({ cliente, pago, resumen, summary }) {
  const doc = new jsPDF();
  const monto = Number(pago.monto) || 0;
  const saldoActual = resumen?.saldoPendiente ?? 0;
  const saldoProyectado = Math.max(0, saldoActual - monto);
  const vehicleLabel = getVehicleLabel(cliente, summary);

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(10, 25, 38);
  doc.text(BRAND_NAME, 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Recibo de abono / comprobante de pago', 14, 28);
  doc.text(`Fecha del abono: ${formatReceiptDate(pago.fechaAbono)}`, 14, 35);
  doc.text(`Emitido: ${formatReceiptDate(new Date())}`, 14, 42);

  let y = 54;

  y = writeSectionTitle(doc, 'Datos del cliente', y);
  y = writeRow(doc, 'Cliente', cliente.nombreCompleto, y);
  if (cliente.telefono) y = writeRow(doc, 'Teléfono', cliente.telefono, y);
  y = writeRow(doc, 'Vehículo', vehicleLabel, y);
  y = writeRow(doc, 'Lote', cliente.lote ?? '—', y);
  y = writeRow(doc, 'VIN', cliente.vin ?? '—', y);
  y += 4;

  y = writeSectionTitle(doc, 'Detalle del abono', y);
  y = writeRow(doc, 'Concepto', getConceptLabel(pago.concepto), y);
  y = writeRow(doc, 'Método de pago', getMetodoLabel(pago.metodoPago), y);
  if (pago.notas?.trim()) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Notas', 18, y);
    doc.setTextColor(15, 23, 42);
    const notasLines = doc.splitTextToSize(pago.notas.trim(), 110);
    doc.text(notasLines, 196, y, { align: 'right' });
    y += notasLines.length * 6 + 4;
  }
  y += 2;

  doc.setDrawColor(10, 25, 38);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFillColor(10, 25, 38);
  doc.roundedRect(14, y - 6, 182, 14, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MONTO ABONADO', 18, y + 3);
  doc.text(formatMoney(monto), 192, y + 3, { align: 'right' });
  y += 18;

  if (resumen) {
    y = writeSectionTitle(doc, 'Estado de cuenta', y);
    y = writeRow(doc, 'Costo total pactado', formatMoney(resumen.costoTotalPactado), y);
    y = writeRow(doc, 'Total abonado (previo)', formatMoney(resumen.totalPagado), y);
    y = writeRow(doc, 'Saldo antes de este abono', formatMoney(saldoActual), y);
    y = writeRow(doc, 'Saldo después de este abono', saldoProyectado > 0 ? formatMoney(saldoProyectado) : 'Liquidado', y, { bold: true });
  }

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento generado por ${BRAND_NAME} · Recibo de pago`, 14, 285);

  const slug = cliente.nombreCompleto?.replace(/\s+/g, '-').toLowerCase().slice(0, 24) || 'cliente';
  doc.save(`recibo-${BRAND_SLUG}-${slug}-${Date.now()}.pdf`);
}
