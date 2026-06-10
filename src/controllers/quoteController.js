import { findClientById } from '../models/clientModel.js';
import { createOrUpdateQuote, findQuoteByClientId } from '../models/quoteModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

const QUOTE_FIELDS = [
  'totalVehiculo',
  'datosVehiculo',
  'fees',
  'tarifaUsa',
  'transferenciaDineroUsa',
  'comisionTresPorcento',
  'transporte',
  'guiaParaRecoger',
  'comisionImportador',
  'documentoIngreso',
  'chaperia',
  'pintura',
  'repuestos',
  'poliza',
  'tramitesAduana',
];

/**
 * Normaliza un identificador de cliente a un ObjectId hex de 24 caracteres.
 * @param {string} rawId - ID recibido desde la URL o body.
 * @returns {string|null} ID válido o null si no se puede interpretar.
 */
function normalizeClientId(rawId) {
  if (!rawId) return null;

  const trimmed = String(rawId).trim();

  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.$oid && /^[a-f\d]{24}$/i.test(parsed.$oid)) {
      return parsed.$oid;
    }
  } catch {
    // No es JSON, continuar con validación estándar
  }

  return null;
}

/**
 * Calcula el costo total de importación sumando todos los rubros financieros.
 * @param {object} cotizacion - Documento de cotización almacenado.
 * @returns {number} Costo total calculado.
 */
function calculateTotalCost(cotizacion) {
  return QUOTE_FIELDS.reduce((total, field) => {
    const value = Number(cotizacion[field]) || 0;
    return total + value;
  }, 0);
}

/**
 * Guarda o actualiza la cotización detallada de un cliente.
 * @param {import('express').Request} req - Petición con clientId en la URL y datos de cotización en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function saveQuote(req, res) {
  try {
    const clientId = normalizeClientId(req.params.clientId);

    if (!clientId) {
      return sendError(
        res,
        400,
        'Identificador de cliente inválido. La URL debe ser: POST /api/quotes/ID_DE_24_CARACTERES'
      );
    }

    const camposFaltantes = QUOTE_FIELDS.filter((field) => req.body[field] === undefined);
    if (camposFaltantes.length > 0) {
      return sendError(res, 400, `Faltan campos requeridos: ${camposFaltantes.join(', ')}`);
    }

    const cliente = await findClientById(clientId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    await createOrUpdateQuote(clientId, req.body);

    const cotizacion = await findQuoteByClientId(clientId);
    const costoTotalCalculado = calculateTotalCost(cotizacion);

    return sendSuccess(res, 200, {
      message: 'Cotización guardada correctamente',
      cotizacion,
      costoTotalCalculado,
    });
  } catch (error) {
    console.error('Error en saveQuote:', error.message);
    return sendError(res, 500, 'Error interno al guardar la cotización');
  }
}

/**
 * Obtiene el desglose de costos y el total calculado de la importación de un cliente.
 * @param {import('express').Request} req - Petición con clientId en los parámetros de la URL.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getQuoteByClient(req, res) {
  try {
    const clientId = normalizeClientId(req.params.clientId);

    if (!clientId) {
      return sendError(res, 400, 'Identificador de cliente inválido');
    }

    const cliente = await findClientById(clientId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const cotizacion = await findQuoteByClientId(clientId);
    if (!cotizacion) {
      return sendError(res, 404, 'Cotización no encontrada para este cliente');
    }

    const costoTotalCalculado = calculateTotalCost(cotizacion);

    return sendSuccess(res, 200, {
      cliente: {
        id: cliente._id,
        nombreCompleto: cliente.nombreCompleto,
      },
      cotizacion,
      costoTotalCalculado,
    });
  } catch (error) {
    return sendError(res, 400, 'No se pudo obtener la cotización. Verifique el identificador');
  }
}
