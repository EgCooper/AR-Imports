import { jsPDF } from 'jspdf';

import { BRAND_NAME, BRAND_SLUG } from '../constants/brand.js';

const TIPOS_VEHICULO = {
  AUTO: 'Automóvil',
  MOTO: 'Motocicleta',
};

/** Colores por sección (mismos del formulario de cotizaciones). */
const SECTION_COLORS = {
  origen: {
    bar: [100, 116, 139],
    headerBg: [248, 250, 252],
    title: [15, 23, 42],
    border: [203, 213, 225],
  },
  logistica: {
    bar: [59, 130, 246],
    headerBg: [239, 246, 255],
    title: [23, 37, 84],
    border: [191, 219, 254],
  },
  taller: {
    bar: [5, 150, 105],
    headerBg: [236, 253, 245],
    title: [2, 44, 34],
    border: [167, 243, 208],
  },
  legal: {
    bar: [168, 85, 247],
    headerBg: [250, 245, 255],
    title: [59, 7, 100],
    border: [233, 213, 255],
  },
};

/** Secciones — orden: origen → logística → taller → legal. */
const PDF_SECTIONS = [
  {
    id: 'origen',
    title: 'Origen, Compra y Datos',
    colors: SECTION_COLORS.origen,
    items: [
      { key: 'totalVehiculo', label: 'Precio de compra aprox.' },
      { key: 'fees', label: 'Fees' },
      { key: 'tarifaUsa', label: 'Tarifa USA' },
      { key: 'comisionTresPorcento', label: 'Comisión vehículo' },
    ],
  },
  {
    id: 'logistica',
    title: 'Logística Intermedia',
    colors: SECTION_COLORS.logistica,
    items: [
      { key: 'transporte', label: 'Grúa interna / Transporte' },
      { key: 'guiaParaRecoger', label: 'Guía para recoger' },
      { key: 'comisionImportador', label: 'Comisión general' },
      { key: 'documentoIngreso', label: 'Documento de ingreso' },
    ],
  },
  {
    id: 'taller',
    title: 'Taller y Reacondicionamiento',
    colors: SECTION_COLORS.taller,
    items: [
      { key: 'chaperia', label: 'Chapería' },
      { key: 'pintura', label: 'Pintura' },
      { key: 'repuestos', label: 'Repuestos' },
    ],
  },
  {
    id: 'legal',
    title: 'Legalización y Aduana',
    colors: SECTION_COLORS.legal,
    items: [
      { key: 'poliza', label: 'Póliza' },
      { key: 'tramitesAduana', label: 'Trámites aduana' },
    ],
  },
];

const MARGIN_X = 14;
const CONTENT_W = 182;
const RIGHT_X = MARGIN_X + CONTENT_W;

function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function num(value) {
  return Number(value) || 0;
}

function formatFecha() {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function sectionSubtotal(form, section) {
  return section.items.reduce((sum, { key }) => sum + num(form[key]), 0);
}

/**
 * Dibuja una sección a ancho completo (encabezado de color + filas + subtotal).
 * @returns {number} Nueva posición Y.
 */
function drawSection(doc, section, form, y) {
  const { colors, title, items } = section;
  const headerH = 9;
  const rowH = 8;
  const bodyPadTop = 3;
  const bodyPadBottom = 2;
  const bodyH = bodyPadTop + items.length * rowH + bodyPadBottom;
  const footerH = 8;
  const blockH = headerH + bodyH + footerH;
  const labelX = MARGIN_X + 6;
  const amountX = RIGHT_X - 5;

  // Encabezado
  doc.setFillColor(...colors.headerBg);
  doc.rect(MARGIN_X, y, CONTENT_W, headerH, 'F');
  doc.setFillColor(...colors.bar);
  doc.rect(MARGIN_X, y, 3, headerH, 'F');

  doc.setFontSize(10.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...colors.title);
  doc.text(title, labelX, y + 6.2);

  // Filas a ancho completo (sin marcas laterales)
  items.forEach(({ key, label }, i) => {
    const rowY = y + headerH + bodyPadTop + 5 + i * rowH;

    if (i > 0) {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(labelX, rowY - 3.5, amountX, rowY - 3.5);
    }

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, labelX, rowY);

    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatMoney(num(form[key])), amountX, rowY, { align: 'right' });
  });

  // Subtotal
  const footerY = y + headerH + bodyH;
  doc.setFillColor(...colors.headerBg);
  doc.rect(MARGIN_X, footerY, CONTENT_W, footerH, 'F');
  doc.setFillColor(...colors.bar);
  doc.rect(MARGIN_X, footerY, 3, footerH, 'F');

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...colors.title);
  doc.text('Subtotal', labelX, footerY + 5.4);
  doc.text(formatMoney(sectionSubtotal(form, section)), amountX, footerY + 5.4, { align: 'right' });

  // Borde del bloque
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.35);
  doc.rect(MARGIN_X, y, CONTENT_W, blockH, 'S');

  return y + blockH + 4;
}

/**
 * PDF de cotización en una sola página A4.
 * Listado vertical ampliado: cada sección a ancho completo con un rubro por fila.
 */
export function downloadQuotePdf(form, granTotal, clientName = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 14;

  // ── Franja superior de marca ────────────────────────────────
  doc.setFillColor(10, 25, 38);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(0, 135, 90);
  doc.rect(0, 26, 210, 1.5, 'F');

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(BRAND_NAME, MARGIN_X, 12);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Cotización de importación vehicular', MARGIN_X, 19.5);

  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text(formatFecha(), RIGHT_X, 12, { align: 'right' });
  if (clientName) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(167, 243, 208);
    doc.text(clientName, RIGHT_X, 19.5, { align: 'right' });
  }

  y = 34;

  // ── Datos del vehículo ──────────────────────────────────────
  const vehicleH = 18;
  const origenColors = SECTION_COLORS.origen;
  doc.setFillColor(...origenColors.headerBg);
  doc.setDrawColor(...origenColors.border);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, vehicleH, 2, 2, 'FD');
  doc.setFillColor(...origenColors.bar);
  doc.rect(MARGIN_X, y, 3, vehicleH, 'F');

  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...origenColors.title);
  doc.text('DATOS DEL VEHÍCULO', MARGIN_X + 6, y + 5.5);

  const vehicleFields = [
    ['Marca', form.marca?.trim() || '—'],
    ['Modelo', form.modelo?.trim() || '—'],
    ['Año', form.ano?.trim() || '—'],
    ['Tipo', TIPOS_VEHICULO[form.tipoVehiculo] ?? form.tipoVehiculo ?? '—'],
  ];
  const fieldW = CONTENT_W / 4;
  vehicleFields.forEach(([label, val], i) => {
    const fx = MARGIN_X + 6 + i * fieldW;
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), fx, y + 10.5);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), fx, y + 15.5);
  });
  y += vehicleH + 6;

  // ── Columnas de concepto / monto ────────────────────────────
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('CONCEPTO', MARGIN_X + 2, y);
  doc.text('MONTO (USD)', RIGHT_X - 2, y, { align: 'right' });
  y += 4;

  // ── Secciones apiladas (todo en 1 página) ───────────────────
  PDF_SECTIONS.forEach((section) => {
    y = drawSection(doc, section, form, y);
  });

  // ── Total ───────────────────────────────────────────────────
  y += 2;
  doc.setFillColor(10, 25, 38);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 16, 2, 2, 'F');
  doc.setFillColor(0, 135, 90);
  doc.rect(MARGIN_X, y, 3.5, 16, 'F');

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL COTIZACIÓN', MARGIN_X + 8, y + 10.5);
  doc.setFontSize(16);
  doc.text(formatMoney(granTotal), RIGHT_X - 5, y + 10.5, { align: 'right' });

  // Pie
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento generado por ${BRAND_NAME}`, MARGIN_X, 290);

  doc.save(`cotizacion-${BRAND_SLUG}-${Date.now()}.pdf`);
}
