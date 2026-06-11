import { jsPDF } from 'jspdf';

const TIPOS_VEHICULO = {
  AUTO: 'Automóvil',
  MOTO: 'Motocicleta',
};

/** Secciones del PDF — cada rubro listado, sin subtotales agrupados. */
const PDF_SECTIONS = [
  {
    title: 'Origen, Compra y Datos',
    items: [
      { key: 'totalVehiculo', label: 'Precio de compra aprox.' },
      { key: 'fees', label: 'Fees' },
      { key: 'tarifaUsa', label: 'Tarifa USA' },
      { key: 'transferenciaDineroUsa', label: 'Transferencia de dinero a USA' },
      { key: 'comisionTresPorcento', label: '3% del total del vehículo (automático)' },
    ],
  },
  {
    title: 'Logística Intermedia',
    items: [
      { key: 'transporte', label: 'Grúa interna / Transporte' },
      { key: 'guiaParaRecoger', label: 'Guía para recoger' },
      { key: 'comisionImportador', label: 'Comisión general' },
      { key: 'documentoIngreso', label: 'Documento de ingreso' },
    ],
  },
  {
    title: 'Taller y Reacondicionamiento',
    items: [
      { key: 'chaperia', label: 'Chapería' },
      { key: 'pintura', label: 'Pintura' },
      { key: 'repuestos', label: 'Repuestos' },
    ],
  },
  {
    title: 'Legalización y Aduana',
    items: [
      { key: 'poliza', label: 'Póliza' },
      { key: 'tramitesAduana', label: 'Trámites aduana' },
    ],
  },
];

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

function ensureSpace(doc, y, needed = 12) {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

function writeLine(doc, label, value, y) {
  y = ensureSpace(doc, y, 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(label, 18, y);
  doc.text(formatMoney(value), 196, y, { align: 'right' });
  return y + 7;
}

function writeSectionTitle(doc, title, y) {
  y = ensureSpace(doc, y, 14);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(10, 25, 38);
  doc.text(title, 14, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2);
  return y + 10;
}

/**
 * Genera y descarga un PDF con el desglose completo línea por línea de la cotización.
 */
export function downloadQuotePdf(form, granTotal, clientName = '') {
  const doc = new jsPDF();
  const fecha = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(10, 25, 38);
  doc.text('AR-Imports', 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Cotización detallada de importación vehicular', 14, 28);
  doc.text(`Fecha: ${fecha}`, 14, 35);
  if (clientName) {
    doc.text(`Cliente: ${clientName}`, 14, 42);
  }

  let y = clientName ? 52 : 46;

  // Datos del vehículo — campos individuales
  y = writeSectionTitle(doc, 'Datos del vehículo', y);
  const vehicleRows = [
    ['Marca', form.marca?.trim() || '—'],
    ['Modelo', form.modelo?.trim() || '—'],
    ['Año', form.ano?.trim() || '—'],
    ['Tipo', TIPOS_VEHICULO[form.tipoVehiculo] ?? form.tipoVehiculo ?? '—'],
  ];
  vehicleRows.forEach(([label, val]) => {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 18, y);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 80, y);
    y += 7;
  });
  y += 4;

  // Encabezado de columnas
  y = ensureSpace(doc, y, 12);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Concepto', 14, y);
  doc.text('Monto (USD)', 196, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 8;

  // Cada sección con todos sus rubros
  PDF_SECTIONS.forEach((section) => {
    y = writeSectionTitle(doc, section.title, y);
    section.items.forEach(({ key, label }) => {
      y = writeLine(doc, label, num(form[key]), y);
    });
    y += 3;
  });

  // Total
  y = ensureSpace(doc, y, 16);
  doc.setDrawColor(10, 25, 38);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 10;
  doc.setFillColor(10, 25, 38);
  doc.roundedRect(14, y - 6, 182, 14, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('GRAN TOTAL DE COTIZACIÓN', 18, y + 3);
  doc.text(formatMoney(granTotal), 192, y + 3, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Documento generado por AR-Imports ERP · Desglose completo', 14, 285);

  doc.save(`cotizacion-ar-imports-${Date.now()}.pdf`);
}

/**
 * HTML de impresión con el mismo desglose detallado (fallback si jsPDF no está disponible).
 */
export function printQuoteDetailed(form, granTotal, clientName = '') {
  const sectionsHtml = PDF_SECTIONS.map(
    (section) => `
    <h3>${section.title}</h3>
    <table>
      ${section.items
        .map(
          ({ key, label }) =>
            `<tr><td>${label}</td><td>${formatMoney(num(form[key]))}</td></tr>`
        )
        .join('')}
    </table>`
  ).join('');

  const tipo = TIPOS_VEHICULO[form.tipoVehiculo] ?? form.tipoVehiculo ?? '—';
  const html = `<!DOCTYPE html><html><head><title>Cotización AR-Imports</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:32px;max-width:720px;margin:0 auto;color:#0f172a}
      h1{color:#0a1926;margin:0 0 4px;font-size:22px}
      .muted{color:#64748b;font-size:13px;margin-bottom:20px}
      h3{font-size:14px;color:#0a1926;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:13px}
      td{padding:6px 0;border-bottom:1px solid #f1f5f9}
      td:last-child{text-align:right;font-weight:600;white-space:nowrap}
      .vehicle td:first-child{color:#64748b;width:100px}
      .total{margin-top:24px;padding:16px 20px;background:#0a1926;color:#fff;border-radius:10px;display:flex;justify-content:space-between;font-size:20px;font-weight:bold}
    </style></head><body>
    <h1>AR-Imports</h1>
    <p class="muted">Cotización detallada${clientName ? ` · ${clientName}` : ''} · ${new Date().toLocaleDateString('es-BO')}</p>
    <h3>Datos del vehículo</h3>
    <table class="vehicle">
      <tr><td>Marca</td><td>${form.marca?.trim() || '—'}</td></tr>
      <tr><td>Modelo</td><td>${form.modelo?.trim() || '—'}</td></tr>
      <tr><td>Año</td><td>${form.ano?.trim() || '—'}</td></tr>
      <tr><td>Tipo</td><td>${tipo}</td></tr>
    </table>
    ${sectionsHtml}
    <div class="total"><span>Gran total de cotización</span><span>${formatMoney(granTotal)}</span></div>
    </body></html>`;

  const win = window.open('', '_blank', 'width=760,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}
