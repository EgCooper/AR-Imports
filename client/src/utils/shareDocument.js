import { BRAND_NAME } from '../constants/brand.js';
import { formatDate, getConceptLabel } from '../components/clients/clientConstants.js';
import { formatDualMoney } from './currency.js';

/**
 * @param {string} phone - Número con código de país, solo dígitos (ej. 59170000000)
 * @param {string} text
 */
export function openWhatsAppShare(phone, text) {
  const base = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * @param {string} email
 * @param {string} subject
 * @param {string} body
 */
export function openEmailShare(email, subject, body) {
  const params = new URLSearchParams({
    subject,
    body,
  });
  const mailto = email ? `mailto:${encodeURIComponent(email)}?${params}` : `mailto:?${params}`;
  window.location.href = mailto;
}

/**
 * @param {object} quote
 * @param {number} [tipoCambioBob]
 */
export function buildQuoteShareText(quote, tipoCambioBob) {
  const vehicle = quote.datosVehiculo || [quote.marca, quote.modelo, quote.ano].filter(Boolean).join(' ');
  const total = formatDualMoney(quote.costoTotalCalculado, tipoCambioBob);
  const clientLine = quote.clienteNombre ? `Cliente: ${quote.clienteNombre}\n` : '';

  return [
    `*${BRAND_NAME}* — Cotización`,
    '',
    clientLine.trim(),
    `Vehículo: ${vehicle || '—'}`,
    `Fecha: ${quote.fechaCreacion ? formatDate(quote.fechaCreacion) : '—'}`,
    `Total: ${total}`,
    '',
    'Descarga el PDF detallado desde el sistema ERP.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {object} options
 * @param {object} options.client
 * @param {object} options.pago
 * @param {object} [options.resumen]
 * @param {number} [options.tipoCambioBob]
 */
export function buildPaymentShareText({ client, pago, resumen, tipoCambioBob }) {
  const monto = formatDualMoney(pago.monto, tipoCambioBob);
  const saldo = resumen?.saldoPendiente != null
    ? formatDualMoney(resumen.saldoPendiente, tipoCambioBob)
    : null;

  return [
    `*${BRAND_NAME}* — Comprobante de abono`,
    '',
    `Cliente: ${client?.nombreCompleto ?? '—'}`,
    `Concepto: ${getConceptLabel(pago.concepto)}`,
    `Método: ${pago.metodoPago}`,
    `Monto: ${monto}`,
    `Fecha: ${pago.fechaAbono ? formatDate(pago.fechaAbono) : '—'}`,
    saldo != null ? `Saldo pendiente: ${saldo}` : '',
    '',
    'Adjunta o descarga el recibo PDF desde el sistema.',
  ]
    .filter(Boolean)
    .join('\n');
}
