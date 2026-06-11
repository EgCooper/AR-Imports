import { findClientById } from '../models/clientModel.js';
import {
  createOrUpdateQuote,
  createQuote,
  findAllQuotes,
  findQuoteByClientId,
  findQuoteById,
  updateQuoteById,
} from '../models/quoteModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

const QUOTE_NUMERIC_FIELDS = [
  'totalVehiculo',
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

const QUOTE_FIELDS = ['datosVehiculo', ...QUOTE_NUMERIC_FIELDS];

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
  return QUOTE_NUMERIC_FIELDS.reduce((total, field) => {
    const value = Number(cotizacion[field]) || 0;
    return total + value;
  }, 0);
}

function normalizeQuoteId(rawId) {
  if (!rawId) return null;
  const trimmed = String(rawId).trim();
  return /^[a-f\d]{24}$/i.test(trimmed) ? trimmed : null;
}

function mapQuoteResponse(cotizacion, cliente = null) {
  return {
    id: cotizacion._id.toString(),
    clienteId: cotizacion.clienteId ? cotizacion.clienteId.toString() : null,
    clienteNombre: cliente?.nombreCompleto ?? null,
    clienteTelefono: cliente?.telefono ?? null,
    datosVehiculo: cotizacion.datosVehiculo,
    marca: cotizacion.marca,
    modelo: cotizacion.modelo,
    ano: cotizacion.ano,
    tipoVehiculo: cotizacion.tipoVehiculo,
    fechaCreacion: cotizacion.fechaCreacion,
    costoTotalCalculado: calculateTotalCost(cotizacion),
    ...Object.fromEntries(QUOTE_NUMERIC_FIELDS.map((f) => [f, Number(cotizacion[f]) || 0])),
  };
}

function validateQuoteBody(body, res) {
  const camposFaltantes = QUOTE_FIELDS.filter((field) => body[field] === undefined);
  if (camposFaltantes.length > 0) {
    sendError(res, 400, `Faltan campos requeridos: ${camposFaltantes.join(', ')}`);
    return false;
  }

  if (body.tipoVehiculo && !TIPOS_VEHICULO.includes(body.tipoVehiculo)) {
    sendError(res, 400, `tipoVehiculo debe ser uno de: ${TIPOS_VEHICULO.join(', ')}`);
    return false;
  }

  return true;
}

const TIPOS_VEHICULO = ['AUTO', 'MOTO'];

/**
 * Lista todas las cotizaciones registradas en el sistema.
 */
export async function listQuotes(req, res) {
  try {
    const cotizaciones = await findAllQuotes();
    const data = cotizaciones.map((cot) => mapQuoteResponse(cot, cot.cliente ?? null));
    return sendSuccess(res, 200, data);
  } catch (error) {
    console.error('Error en listQuotes:', error.message);
    return sendError(res, 500, 'Error interno al listar cotizaciones');
  }
}

/**
 * Crea una cotización nueva (cliente opcional en el body).
 */
export async function createQuoteHandler(req, res) {
  try {
    if (!validateQuoteBody(req.body, res)) return;

    const clientId = req.body.clienteId ? normalizeClientId(req.body.clienteId) : null;
    if (req.body.clienteId && !clientId) {
      return sendError(res, 400, 'Identificador de cliente inválido');
    }

    if (clientId) {
      const cliente = await findClientById(clientId);
      if (!cliente) {
        return sendError(res, 404, 'Cliente no encontrado');
      }
    }

    const { clienteId: _omit, ...quotePayload } = req.body;
    const result = await createQuote(quotePayload, clientId);
    const cotizacion = await findQuoteById(result.insertedId.toString());
    const cliente = clientId ? await findClientById(clientId) : null;

    return sendSuccess(res, 201, {
      message: 'Cotización creada correctamente',
      cotizacion: mapQuoteResponse(cotizacion, cliente),
    });
  } catch (error) {
    console.error('Error en createQuoteHandler:', error.message);
    return sendError(res, 500, 'Error interno al crear la cotización');
  }
}

/**
 * Actualiza una cotización existente por su identificador de documento.
 */
export async function updateQuoteItem(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) {
      return sendError(res, 400, 'Identificador de cotización inválido');
    }

    if (!validateQuoteBody(req.body, res)) return;

    const existing = await findQuoteById(quoteId);
    if (!existing) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    const result = await updateQuoteById(quoteId, req.body);
    if (!result) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    const cotizacion = await findQuoteById(quoteId);
    const cliente = cotizacion.clienteId
      ? await findClientById(cotizacion.clienteId.toString())
      : null;

    return sendSuccess(res, 200, {
      message: 'Cotización actualizada correctamente',
      cotizacion: mapQuoteResponse(cotizacion, cliente),
    });
  } catch (error) {
    console.error('Error en updateQuoteItem:', error.message);
    return sendError(res, 500, 'Error interno al actualizar la cotización');
  }
}

/**
 * Obtiene una cotización por su identificador de documento.
 */
export async function getQuoteById(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) {
      return sendError(res, 400, 'Identificador de cotización inválido');
    }

    const cotizacion = await findQuoteById(quoteId);
    if (!cotizacion) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    const cliente = cotizacion.clienteId
      ? await findClientById(cotizacion.clienteId.toString())
      : null;

    return sendSuccess(res, 200, mapQuoteResponse(cotizacion, cliente));
  } catch (error) {
    return sendError(res, 400, 'No se pudo obtener la cotización');
  }
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

    if (req.body.tipoVehiculo && !TIPOS_VEHICULO.includes(req.body.tipoVehiculo)) {
      return sendError(res, 400, `tipoVehiculo debe ser uno de: ${TIPOS_VEHICULO.join(', ')}`);
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
