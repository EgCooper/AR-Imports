import { getDB } from '../config/db.js';

/**
 * Obtiene métricas agregadas y pagos recientes para el dashboard.
 * @returns {Promise<object>} Datos del dashboard.
 */
export async function getDashboardStats() {
  const db = await getDB();
  const clientsCol = db.collection('Cliente');
  const quotesCol = db.collection('cotizaciones');
  const paymentsCol = db.collection('Pago');

  const [
    clientesRegistrados,
    cotizacionesHechas,
    ventasHechas,
    estadosAgg,
    pagosRecientes,
  ] = await Promise.all([
    clientsCol.countDocuments(),
    quotesCol.countDocuments(),
    paymentsCol.distinct('clienteId').then((ids) => ids.length),
    clientsCol.aggregate([{ $group: { _id: '$estadoAuto', count: { $sum: 1 } } }]).toArray(),
    paymentsCol
      .aggregate([
        { $sort: { fechaAbono: -1 } },
        { $limit: 12 },
        {
          $lookup: {
            from: 'Cliente',
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente',
          },
        },
        { $unwind: '$cliente' },
        {
          $lookup: {
            from: 'cotizaciones',
            localField: 'clienteId',
            foreignField: 'clienteId',
            as: 'cotizacion',
          },
        },
      ])
      .toArray(),
  ]);

  const conteoPorEstado = estadosAgg.reduce((acc, { _id, count }) => {
    acc[_id ?? 'SIN_ESTADO'] = count;
    return acc;
  }, {});

  const pagosFormateados = pagosRecientes.map((pago) => {
    const cot = pago.cotizacion?.[0];
    const vehiculo = pago.cliente.vehiculo?.trim()
      || (cot?.marca
        ? `${cot.marca} ${cot.modelo ?? ''}${cot.ano ? ` ${cot.ano}` : ''}`.trim()
        : `${pago.cliente.vin ?? ''} · Lote ${pago.cliente.lote ?? ''}`.trim());

    return {
      id: pago._id.toString(),
      clienteNombre: pago.cliente.nombreCompleto,
      fecha: pago.fechaAbono,
      monto: pago.monto,
      vehiculo,
      estadoAuto: pago.cliente.estadoAuto ?? 'USA',
    };
  });

  return {
    metricas: {
      cotizacionesHechas,
      ventasHechas,
      clientesRegistrados,
      vehiculosEnChile: conteoPorEstado.CHILE ?? 0,
      vehiculosEnBolivia: conteoPorEstado.BOLIVIA ?? 0,
      vehiculosEnAduana: conteoPorEstado.ADUANA_BOLIVIA ?? 0,
      vehiculosEnTaller: conteoPorEstado.TALLER ?? 0,
    },
    pagosRecientes: pagosFormateados,
  };
}
