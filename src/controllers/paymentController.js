import { findClientById } from '../models/clientModel.js';
import {
  CONCEPTOS_VALIDOS,
  createPayment,
  findPaymentsByClientId,
} from '../models/paymentModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

/**
 * Valida que un valor sea un número estrictamente positivo.
 * @param {unknown} value - Valor a evaluar.
 * @returns {boolean} true si es un número mayor que cero.
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
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

    if (!isPositiveNumber(monto)) {
      return sendError(res, 400, 'El monto debe ser un número positivo');
    }

    if (!CONCEPTOS_VALIDOS.includes(concepto)) {
      return sendError(res, 400, `El concepto debe ser uno de: ${CONCEPTOS_VALIDOS.join(', ')}`);
    }

    const cliente = await findClientById(clienteId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const resultado = await createPayment({
      clienteId,
      monto,
      fechaAbono,
      concepto,
      metodoPago,
      comprobanteUrl,
      notas,
    });

    return sendSuccess(res, 201, {
      id: resultado.insertedId,
      message: 'Pago registrado correctamente',
    });
  } catch (error) {
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
      cliente: {
        id: cliente._id,
        nombreCompleto: cliente.nombreCompleto,
      },
      resumenFinanciero: {
        costoTotalPactado,
        totalPagado,
        saldoPendiente,
      },
      historialAbonos,
    });
  } catch (error) {
    return sendError(res, 400, 'No se pudo obtener el estado de cuenta. Verifique el identificador');
  }
}
