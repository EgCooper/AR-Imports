import { getDB } from '../config/db.js';

function buildDateRange(fechaDesde, fechaHasta) {
  if (!fechaDesde && !fechaHasta) return null;

  const range = {};
  if (fechaDesde) range.$gte = new Date(`${fechaDesde}T00:00:00.000Z`);
  if (fechaHasta) range.$lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  return range;
}

const ACTIVE_CLIENT_FILTER = { archivado: { $ne: true } };
const ACTIVE_QUOTE_FILTER = { archivada: { $ne: true } };

/**
 * Resumen financiero y operativo para reportes.
 * @param {{ fechaDesde?: string, fechaHasta?: string }} filters
 */
export async function getReportsSummary({ fechaDesde, fechaHasta } = {}) {
  const db = await getDB();
  const clientsCol = db.collection('Cliente');
  const quotesCol = db.collection('cotizaciones');
  const paymentsCol = db.collection('Pago');

  const paymentDateRange = buildDateRange(fechaDesde, fechaHasta);
  const clientDateRange = buildDateRange(fechaDesde, fechaHasta);
  const quoteDateRange = buildDateRange(fechaDesde, fechaHasta);

  const paymentMatch = {
    anulado: { $ne: true },
    ...(paymentDateRange ? { fechaAbono: paymentDateRange } : {}),
  };

  const [
    clientesActivos,
    clientesRegistradosEnPeriodo,
    cotizacionesActivas,
    cotizacionesEnPeriodo,
    pagosAgg,
    saldosAgg,
    porEstado,
    pagosPorConcepto,
  ] = await Promise.all([
    clientsCol.countDocuments(ACTIVE_CLIENT_FILTER),
    clientDateRange
      ? clientsCol.countDocuments({ ...ACTIVE_CLIENT_FILTER, fechaRegistro: clientDateRange })
      : Promise.resolve(null),
    quotesCol.countDocuments(ACTIVE_QUOTE_FILTER),
    quoteDateRange
      ? quotesCol.countDocuments({ ...ACTIVE_QUOTE_FILTER, fechaCreacion: quoteDateRange })
      : Promise.resolve(null),
    paymentsCol
      .aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: null,
            totalIngresos: { $sum: '$monto' },
            cantidadPagos: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    clientsCol
      .aggregate([
        { $match: ACTIVE_CLIENT_FILTER },
        {
          $lookup: {
            from: 'Pago',
            let: { clientId: '$_id', costo: '$costoTotalPactado' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$clienteId', '$$clientId'] },
                  anulado: { $ne: true },
                },
              },
              { $group: { _id: null, totalPagado: { $sum: '$monto' } } },
            ],
            as: 'pagos',
          },
        },
        {
          $addFields: {
            totalPagado: { $ifNull: [{ $arrayElemAt: ['$pagos.totalPagado', 0] }, 0] },
          },
        },
        {
          $addFields: {
            saldoPendiente: { $max: [{ $subtract: ['$costoTotalPactado', '$totalPagado'] }, 0] },
          },
        },
        {
          $group: {
            _id: null,
            saldoPendienteTotal: { $sum: '$saldoPendiente' },
            clientesConSaldo: {
              $sum: { $cond: [{ $gt: ['$saldoPendiente', 0] }, 1, 0] },
            },
            costoPactadoTotal: { $sum: '$costoTotalPactado' },
            totalAbonado: { $sum: '$totalPagado' },
          },
        },
      ])
      .toArray(),
    clientsCol
      .aggregate([
        { $match: ACTIVE_CLIENT_FILTER },
        { $group: { _id: '$estadoAuto', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    paymentsCol
      .aggregate([
        { $match: paymentMatch },
        { $group: { _id: '$concepto', total: { $sum: '$monto' }, cantidad: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ])
      .toArray(),
  ]);

  const pagos = pagosAgg[0] ?? { totalIngresos: 0, cantidadPagos: 0 };
  const saldos = saldosAgg[0] ?? {
    saldoPendienteTotal: 0,
    clientesConSaldo: 0,
    costoPactadoTotal: 0,
    totalAbonado: 0,
  };

  return {
    periodo: { fechaDesde: fechaDesde ?? null, fechaHasta: fechaHasta ?? null },
    clientesActivos,
    clientesRegistradosEnPeriodo,
    cotizacionesActivas,
    cotizacionesEnPeriodo,
    ingresosPeriodo: pagos.totalIngresos,
    cantidadPagosPeriodo: pagos.cantidadPagos,
    saldoPendienteTotal: saldos.saldoPendienteTotal,
    clientesConSaldo: saldos.clientesConSaldo,
    costoPactadoTotal: saldos.costoPactadoTotal,
    totalAbonadoGlobal: saldos.totalAbonado,
    clientesPorEstado: porEstado.map(({ _id, count }) => ({
      estado: _id ?? 'SIN_ESTADO',
      count,
    })),
    pagosPorConcepto: pagosPorConcepto.map(({ _id, total, cantidad }) => ({
      concepto: _id,
      total,
      cantidad,
    })),
  };
}

/**
 * Pagos para exportación global con filtros de fecha.
 */
export async function findPaymentsForExport({ fechaDesde, fechaHasta, maxRows = 10_000 } = {}) {
  const db = await getDB();
  const paymentsCol = db.collection('Pago');
  const paymentDateRange = buildDateRange(fechaDesde, fechaHasta);

  const match = {
    anulado: { $ne: true },
    ...(paymentDateRange ? { fechaAbono: paymentDateRange } : {}),
  };

  return paymentsCol
    .aggregate([
      { $match: match },
      { $sort: { fechaAbono: -1 } },
      { $limit: maxRows },
      {
        $lookup: {
          from: 'Cliente',
          localField: 'clienteId',
          foreignField: '_id',
          as: 'cliente',
        },
      },
      { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
}

/**
 * Cotizaciones para exportación.
 */
export async function findQuotesForExport({ fechaDesde, fechaHasta, maxRows = 10_000 } = {}) {
  const db = await getDB();
  const quotesCol = db.collection('cotizaciones');
  const quoteDateRange = buildDateRange(fechaDesde, fechaHasta);

  const match = {
    archivada: { $ne: true },
    ...(quoteDateRange ? { fechaCreacion: quoteDateRange } : {}),
  };

  return quotesCol
    .aggregate([
      { $match: match },
      { $sort: { fechaCreacion: -1 } },
      { $limit: maxRows },
      {
        $lookup: {
          from: 'Cliente',
          localField: 'clienteId',
          foreignField: '_id',
          as: 'cliente',
        },
      },
      { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
}
