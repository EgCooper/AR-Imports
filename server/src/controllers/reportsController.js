import {
  findPaymentsForExport,
  findQuotesForExport,
  getReportsSummary,
} from '../models/reportsModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { buildCsv, sendCsvResponse } from '../utils/csvExport.js';

function parseReportQuery(query) {
  return {
    fechaDesde: query.fechaDesde?.trim() || undefined,
    fechaHasta: query.fechaHasta?.trim() || undefined,
  };
}

function quoteTotal(cot) {
  const fields = [
    'totalVehiculo', 'fees', 'tarifaUsa', 'comisionTresPorcento', 'transporte',
    'guiaParaRecoger', 'comisionImportador', 'documentoIngreso', 'chaperia',
    'pintura', 'repuestos', 'poliza', 'tramitesAduana',
  ];
  const legacy = Number(cot.transferenciaDineroUsa) || 0;
  let total = fields.reduce((sum, f) => sum + (Number(cot[f]) || 0), 0);
  if (legacy) total += legacy;
  return total;
}

export async function getSummaryReport(req, res) {
  try {
    const filters = parseReportQuery(req.query);
    const summary = await getReportsSummary(filters);
    return sendSuccess(res, 200, summary);
  } catch (_error) {
    return sendError(res, 500, 'No se pudo generar el reporte');
  }
}

export async function exportQuotesReportCsv(req, res) {
  try {
    const filters = parseReportQuery(req.query);
    const quotes = await findQuotesForExport(filters);

    const csv = buildCsv(quotes, [
      { header: 'Fecha', value: (row) => row.fechaCreacion ?? '' },
      { header: 'Cliente', value: (row) => row.cliente?.nombreCompleto ?? '' },
      { header: 'Vehiculo', value: (row) => row.datosVehiculo ?? '' },
      { header: 'Marca', value: (row) => row.marca ?? '' },
      { header: 'Modelo', value: (row) => row.modelo ?? '' },
      { header: 'Ano', value: (row) => row.ano ?? '' },
      { header: 'Total USD', value: (row) => quoteTotal(row) },
      { header: 'Vinculada', value: (row) => (row.clienteId ? 'Si' : 'No') },
    ]);

    return sendCsvResponse(res, 'cotizaciones-reporte.csv', csv);
  } catch (_error) {
    return sendError(res, 500, 'No se pudo exportar cotizaciones');
  }
}

export async function exportPaymentsReportCsv(req, res) {
  try {
    const filters = parseReportQuery(req.query);
    const payments = await findPaymentsForExport(filters);

    const csv = buildCsv(payments, [
      { header: 'Fecha', value: (row) => row.fechaAbono ?? '' },
      { header: 'Cliente', value: (row) => row.cliente?.nombreCompleto ?? '' },
      { header: 'Lote', value: (row) => row.cliente?.lote ?? '' },
      { header: 'Concepto', value: (row) => row.concepto ?? '' },
      { header: 'Metodo', value: (row) => row.metodoPago ?? '' },
      { header: 'Monto USD', value: (row) => row.monto ?? 0 },
      { header: 'Notas', value: (row) => row.notas ?? '' },
    ]);

    return sendCsvResponse(res, 'pagos-reporte.csv', csv);
  } catch (_error) {
    return sendError(res, 500, 'No se pudo exportar pagos');
  }
}
