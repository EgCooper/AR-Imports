import { findClientById } from '../models/clientModel.js';
import {
  CONCEPTOS_VALIDOS,
  aggregatePaymentTotalsByClientIds,
  createPayment,
  findPaymentById,
  findPaymentsByClientId,
  updatePaymentById,
  voidPaymentById,
} from '../models/paymentModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { buildCsv, sendCsvResponse } from '../utils/csvExport.js';
import { buildResumenFinanciero } from '../utils/financialSummary.js';
import {
  formatClientRef,
  formatMany,
  formatPayment,
  toIdString,
} from '../utils/formatters.js';
import {
  isAllowedUploadUrl,
  METODOS_PAGO_VALIDOS,
  toPositiveNumber,
} from '../utils/validators.js';

const CONCEPTO_LABELS = {
  PAGO_INICIAL: 'Pago inicial',
  RESERVA: 'Reserva',
  ABONO_SUBASTA: 'Abono para subasta',
  PAGO_FLETE: 'Pago flete',
  TRANSPORTE_PAGO: 'Transporte pago',
  TRAMITES: 'Trámites',
  REPARACIONES: 'Reparaciones',
  REPUESTOS: 'Repuestos',
  OTRO: 'Otro',
};

function validatePaymentFields(body, res) {
  const { monto, concepto, metodoPago } = body;

  if (!concepto || !metodoPago) {
    sendError(res, 400, 'Los campos concepto y metodoPago son requeridos');
    return null;
  }

  const montoNum = toPositiveNumber(monto);
  if (montoNum === null) {
    sendError(res, 400, 'El monto debe ser un número positivo');
    return null;
  }

  if (!CONCEPTOS_VALIDOS.includes(concepto)) {
    sendError(res, 400, `El concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(', ')}`);
    return null;
  }

  if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    sendError(res, 400, `El método de pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}`);
    return null;
  }

  return { montoNum, concepto, metodoPago };
}

/**
 * Registra un nuevo abono para un cliente existente.
 * @param {import('express').Request} req - Petición con los datos del pago en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function registerClientPayment(req, res) {
  try {
    const { clienteId, monto, fechaAbono, concepto, metodoPago, comprobanteUrl, notas } = req.body;

    if (!clienteId || !concepto || !metodoPago) {
      return sendError(res, 400, 'Los campos clienteId, concepto y metodoPago son requeridos');
    }

    const montoNum = toPositiveNumber(monto);
    if (montoNum === null) {
      return sendError(res, 400, 'El monto debe ser un número positivo');
    }

    if (!CONCEPTOS_VALIDOS.includes(concepto)) {
      return sendError(res, 400, `El concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(', ')}`);
    }

    if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
      return sendError(res, 400, `El método de pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}`);
    }

    if (comprobanteUrl && !isAllowedUploadUrl(comprobanteUrl)) {
      return sendError(res, 400, 'comprobanteUrl no es una URL de archivo válida');
    }

    const cliente = await findClientById(clienteId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const resultado = await createPayment({
      clienteId,
      monto: montoNum,
      fechaAbono,
      concepto,
      metodoPago,
      comprobanteUrl,
      notas,
    });

    return sendSuccess(res, 201, {
      id: toIdString(resultado.insertedId),
      message: 'Pago registrado correctamente',
    });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo registrar el pago. Verifique los datos enviados');
  }
}

/**
 * Calcula el estado de cuenta de un cliente: costo pactado, total pagado y saldo pendiente.
 * @param {import('express').Request} req - Petición con el clientId en los parámetros de la URL.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getClientFinancialSummary(req, res) {
  try {
    const { clientId } = req.params;

    const cliente = await findClientById(clientId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const historialAbonos = await findPaymentsByClientId(clientId);

    const totalPagado = historialAbonos
      .filter((pago) => !pago.anulado)
      .reduce((acumulado, pago) => acumulado + pago.monto, 0);
    const costoTotalPactado = cliente.costoTotalPactado ?? 0;
    const saldoPendiente = costoTotalPactado - totalPagado;

    return sendSuccess(res, 200, {
      cliente: formatClientRef(cliente),
      resumenFinanciero: {
        costoTotalPactado,
        totalPagado,
        saldoPendiente,
      },
      historialAbonos: formatMany(historialAbonos, formatPayment),
    });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo obtener el estado de cuenta. Verifique el identificador');
  }
}

const MAX_BATCH_IDS = 200;

/**
 * Devuelve resúmenes financieros de varios clientes en una sola solicitud.
 * @param {import('express').Request} req - Petición con clientIds en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 */
export async function getBatchFinancialSummaries(req, res) {
  try {
    const { clientIds } = req.body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return sendError(res, 400, 'clientIds debe ser un arreglo no vacío');
    }

    if (clientIds.length > MAX_BATCH_IDS) {
      return sendError(res, 400, `Máximo ${MAX_BATCH_IDS} clientes por solicitud`);
    }

    const uniqueIds = [...new Set(clientIds.map((id) => String(id).trim()).filter(Boolean))];
    const invalidIds = uniqueIds.filter((id) => !/^[a-f\d]{24}$/i.test(id));
    if (invalidIds.length > 0) {
      return sendError(res, 400, 'Uno o más identificadores de cliente son inválidos');
    }

    const clients = await Promise.all(uniqueIds.map((id) => findClientById(id)));
    const totalsMap = await aggregatePaymentTotalsByClientIds(uniqueIds);

    const summaries = {};
    uniqueIds.forEach((id, index) => {
      const cliente = clients[index];
      if (!cliente) {
        summaries[id] = null;
        return;
      }

      const costoTotalPactado = cliente.costoTotalPactado ?? 0;
      const totalPagado = totalsMap.get(id) ?? 0;

      summaries[id] = {
        cliente: formatClientRef(cliente),
        resumenFinanciero: buildResumenFinanciero(costoTotalPactado, totalPagado),
      };
    });

    return sendSuccess(res, 200, summaries);
  } catch {
    return sendError(res, 400, 'No se pudieron obtener los resúmenes financieros');
  }
}

/**
 * Actualiza un abono existente (no anulado).
 */
export async function updateClientPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const validated = validatePaymentFields(req.body, res);
    if (!validated) return undefined;

    const existing = await findPaymentById(paymentId);
    if (!existing) {
      return sendError(res, 404, 'Pago no encontrado');
    }
    if (existing.anulado) {
      return sendError(res, 400, 'No se puede editar un abono anulado');
    }

    const updated = await updatePaymentById(paymentId, {
      monto: validated.montoNum,
      fechaAbono: req.body.fechaAbono,
      concepto: validated.concepto,
      metodoPago: validated.metodoPago,
      notas: req.body.notas,
    });

    if (!updated) {
      return sendError(res, 404, 'Pago no encontrado');
    }

    return sendSuccess(res, 200, {
      message: 'Pago actualizado correctamente',
      pago: formatPayment(updated),
    });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo actualizar el pago');
  }
}

/**
 * Anula un abono registrado.
 */
export async function voidClientPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const existing = await findPaymentById(paymentId);

    if (!existing) {
      return sendError(res, 404, 'Pago no encontrado');
    }
    if (existing.anulado) {
      return sendError(res, 400, 'El abono ya está anulado');
    }

    const voided = await voidPaymentById(paymentId, req.body.motivo);
    if (!voided) {
      return sendError(res, 404, 'Pago no encontrado');
    }

    return sendSuccess(res, 200, {
      message: 'Abono anulado correctamente',
      pago: formatPayment(voided),
    });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo anular el abono');
  }
}

/**
 * Exporta el historial de pagos de un cliente a CSV.
 */
export async function exportPaymentsCsv(req, res) {
  try {
    const { clientId } = req.query;
    if (!clientId || !/^[a-f\d]{24}$/i.test(String(clientId))) {
      return sendError(res, 400, 'clientId es requerido y debe ser válido');
    }

    const cliente = await findClientById(String(clientId));
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const pagos = await findPaymentsByClientId(String(clientId));

    const csv = buildCsv(pagos, [
      { header: 'Cliente', value: () => cliente.nombreCompleto },
      { header: 'Fecha', value: (row) => row.fechaAbono ?? '' },
      { header: 'Concepto', value: (row) => CONCEPTO_LABELS[row.concepto] ?? row.concepto },
      { header: 'Metodo', value: (row) => row.metodoPago },
      { header: 'Monto USD', value: (row) => row.monto },
      { header: 'Anulado', value: (row) => (row.anulado ? 'Si' : 'No') },
      { header: 'Notas', value: (row) => row.notas ?? '' },
    ]);

    return sendCsvResponse(res, `pagos-${cliente.lote ?? clientId}.csv`, csv);
  } catch (_error) {
    return sendError(res, 500, 'No se pudo exportar el historial de pagos');
  }
}
