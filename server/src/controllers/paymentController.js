import { findClientById } from '../models/clientModel.js';
import {
  CONCEPTOS_VALIDOS,
  aggregatePaymentTotalsByClientIds,
  createPayment,
  findPaymentsByClientId,
} from '../models/paymentModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
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

    const totalPagado = historialAbonos.reduce((acumulado, pago) => acumulado + pago.monto, 0);
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
