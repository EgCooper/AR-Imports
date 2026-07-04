import { createClient, findClientById } from '../models/clientModel.js';
import { addEstadoHistorialEntry } from '../models/estadoHistorialModel.js';
import {
  archiveQuoteById,
  createOrUpdateQuote,
  createQuote,
  findAllQuotes,
  findQuoteByClientId,
  findQuoteById,
  findQuotesPaginated,
  linkQuoteToClient,
  restoreQuoteById,
  unlinkQuoteFromClient,
  updateQuoteById,
} from '../models/quoteModel.js';
import { logger } from '../utils/logger.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { formatClientRef, formatQuoteDocument } from '../utils/formatters.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { toNonNegativeNumber } from '../utils/validators.js';

const QUOTE_NUMERIC_FIELDS = [
  'totalVehiculo',
  'fees',
  'tarifaUsa',
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
 * Consolida el rubro legado transferenciaDineroUsa dentro de tarifaUsa.
 * @param {object} cotizacion - Documento de cotización almacenado.
 * @returns {object} Campos numéricos normalizados.
 */
function normalizeQuoteAmounts(cotizacion) {
  const amounts = Object.fromEntries(
    QUOTE_NUMERIC_FIELDS.map((f) => [f, Number(cotizacion[f]) || 0])
  );
  const legacyTransfer = Number(cotizacion.transferenciaDineroUsa);
  if (Number.isFinite(legacyTransfer) && legacyTransfer !== 0) {
    amounts.tarifaUsa += legacyTransfer;
  }
  return amounts;
}

/**
 * Calcula el costo total de importación sumando todos los rubros financieros.
 * @param {object} cotizacion - Documento de cotización almacenado.
 * @returns {number} Costo total calculado.
 */
function calculateTotalCost(cotizacion) {
  const amounts = normalizeQuoteAmounts(cotizacion);
  return QUOTE_NUMERIC_FIELDS.reduce((total, field) => total + amounts[field], 0);
}

function normalizeQuoteId(rawId) {
  if (!rawId) return null;
  const trimmed = String(rawId).trim();
  return /^[a-f\d]{24}$/i.test(trimmed) ? trimmed : null;
}

function mapQuoteResponse(cotizacion, cliente = null) {
  const amounts = normalizeQuoteAmounts(cotizacion);
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
    archivada: Boolean(cotizacion.archivada),
    costoTotalCalculado: calculateTotalCost(cotizacion),
    ...amounts,
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

  for (const field of QUOTE_NUMERIC_FIELDS) {
    if (toNonNegativeNumber(body[field]) === null) {
      sendError(res, 400, `${field} debe ser un número mayor o igual a 0`);
      return false;
    }
  }

  return true;
}

const TIPOS_VEHICULO = ['AUTO', 'MOTO'];

/**
 * Lista todas las cotizaciones registradas en el sistema.
 */
export async function listQuotes(req, res) {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

    if (hasPagination) {
      const { page, limit, skip } = parsePagination(req.query);
      const { quotes, total } = await findQuotesPaginated({ skip, limit });
      const data = quotes.map((cot) => mapQuoteResponse(cot, cot.cliente ?? null));

      return sendSuccess(res, 200, {
        items: data,
        pagination: buildPaginationMeta(page, limit, total),
      });
    }

    const cotizaciones = await findAllQuotes();
    const data = cotizaciones.map((cot) => mapQuoteResponse(cot, cot.cliente ?? null));
    return sendSuccess(res, 200, data);
  } catch (error) {
    logger.error({ err: error }, 'Error en listQuotes');
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

    let cliente = null;
    if (clientId) {
      cliente = await findClientById(clientId);
      if (!cliente) {
        return sendError(res, 404, 'Cliente no encontrado');
      }
    }

    const { clienteId: _clienteId, ...quotePayload } = req.body;
    const result = await createQuote(quotePayload, clientId);
    const cotizacion = await findQuoteById(result.insertedId.toString());

    return sendSuccess(res, 201, {
      message: 'Cotización creada correctamente',
      cotizacion: mapQuoteResponse(cotizacion, cliente),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en createQuoteHandler');
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

    const cotizacion = await updateQuoteById(quoteId, req.body);
    if (!cotizacion) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    const cliente = cotizacion.clienteId
      ? await findClientById(cotizacion.clienteId.toString())
      : null;

    return sendSuccess(res, 200, {
      message: 'Cotización actualizada correctamente',
      cotizacion: mapQuoteResponse(cotizacion, cliente),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en updateQuoteItem');
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
  } catch (_error) {
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

    const cotizacion = await createOrUpdateQuote(clientId, req.body);
    const costoTotalCalculado = calculateTotalCost(cotizacion);

    return sendSuccess(res, 200, {
      message: 'Cotización guardada correctamente',
      cotizacion: formatQuoteDocument(cotizacion),
      costoTotalCalculado,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en saveQuote');
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
      cliente: formatClientRef(cliente),
      cotizacion: formatQuoteDocument(cotizacion),
      costoTotalCalculado,
    });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo obtener la cotización. Verifique el identificador');
  }
}

/**
 * Vincula una cotización a un cliente existente (F8).
 */
export async function linkQuoteToClientHandler(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    const clientId = normalizeClientId(req.body.clienteId);

    if (!quoteId) return sendError(res, 400, 'Identificador de cotización inválido');
    if (!clientId) return sendError(res, 400, 'Identificador de cliente inválido');

    const cotizacion = await findQuoteById(quoteId);
    if (!cotizacion || cotizacion.archivada) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    const cliente = await findClientById(clientId);
    if (!cliente || cliente.archivado) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const existing = await findQuoteByClientId(clientId);
    if (existing && existing._id.toString() !== quoteId) {
      return sendError(res, 409, 'Este cliente ya tiene otra cotización vinculada');
    }

    const updated = await linkQuoteToClient(quoteId, clientId);
    return sendSuccess(res, 200, {
      message: 'Cotización vinculada al cliente',
      cotizacion: mapQuoteResponse(updated, cliente),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en linkQuoteToClientHandler');
    return sendError(res, 500, 'No se pudo vincular la cotización');
  }
}

/**
 * Desvincula una cotización de su cliente (F8).
 */
export async function unlinkQuoteHandler(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) return sendError(res, 400, 'Identificador de cotización inválido');

    const updated = await unlinkQuoteFromClient(quoteId);
    if (!updated) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    return sendSuccess(res, 200, {
      message: 'Cotización desvinculada',
      cotizacion: mapQuoteResponse(updated, null),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en unlinkQuoteHandler');
    return sendError(res, 500, 'No se pudo desvincular la cotización');
  }
}

/**
 * Convierte una cotización en cliente registrado (F8).
 */
export async function convertQuoteToClient(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) return sendError(res, 400, 'Identificador de cotización inválido');

    const cotizacion = await findQuoteById(quoteId);
    if (!cotizacion || cotizacion.archivada) {
      return sendError(res, 404, 'Cotización no encontrada');
    }

    if (cotizacion.clienteId) {
      return sendError(res, 409, 'Esta cotización ya está vinculada a un cliente');
    }

    const {
      nombreCompleto,
      telefono,
      vin,
      lote,
      vehiculo,
      estadoAuto = 'USA',
    } = req.body;

    if (!nombreCompleto || !telefono || !vin || !lote) {
      return sendError(res, 400, 'nombreCompleto, telefono, vin y lote son requeridos');
    }

    if (estadoAuto && !['USA', 'CHILE', 'ADUANA_BOLIVIA', 'BOLIVIA', 'TALLER'].includes(estadoAuto)) {
      return sendError(res, 400, 'Estado del vehículo inválido');
    }

    const costoTotalPactado = calculateTotalCost(cotizacion);
    const vehiculoLabel = vehiculo?.trim()
      || cotizacion.datosVehiculo?.trim()
      || [cotizacion.marca, cotizacion.modelo, cotizacion.ano].filter(Boolean).join(' ')
      || null;

    const insertResult = await createClient({
      nombreCompleto: String(nombreCompleto).trim(),
      telefono: String(telefono).trim(),
      vehiculo: vehiculoLabel,
      vin: String(vin).trim(),
      lote: String(lote).trim(),
      costoTotalPactado,
      estadoAuto,
      cotizacionOrigenId: quoteId,
    });

    const clientId = insertResult.insertedId.toString();
    await addEstadoHistorialEntry({
      clienteId: clientId,
      estadoAnterior: null,
      estadoNuevo: estadoAuto,
      notas: 'Cliente creado desde cotización',
      usuarioId: req.user?.id,
    });

    const linked = await linkQuoteToClient(quoteId, clientId);
    const cliente = await findClientById(clientId);

    return sendSuccess(res, 201, {
      message: 'Cliente registrado y cotización vinculada',
      cliente: formatClientRef(cliente),
      cotizacion: mapQuoteResponse(linked, cliente),
      costoTotalPactado,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en convertQuoteToClient');
    return sendError(res, 500, 'No se pudo convertir la cotización en cliente');
  }
}

/**
 * Archiva una cotización (F5).
 */
export async function archiveQuote(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) return sendError(res, 400, 'Identificador de cotización inválido');

    const archived = await archiveQuoteById(quoteId, req.body?.motivo);
    if (!archived) return sendError(res, 404, 'Cotización no encontrada');

    const cliente = archived.clienteId
      ? await findClientById(archived.clienteId.toString())
      : null;

    return sendSuccess(res, 200, {
      message: 'Cotización archivada',
      cotizacion: mapQuoteResponse(archived, cliente),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en archiveQuote');
    return sendError(res, 500, 'No se pudo archivar la cotización');
  }
}

/**
 * Restaura una cotización archivada (F5).
 */
export async function restoreQuote(req, res) {
  try {
    const quoteId = normalizeQuoteId(req.params.quoteId);
    if (!quoteId) return sendError(res, 400, 'Identificador de cotización inválido');

    const restored = await restoreQuoteById(quoteId);
    if (!restored) return sendError(res, 404, 'Cotización archivada no encontrada');

    const cliente = restored.clienteId
      ? await findClientById(restored.clienteId.toString())
      : null;

    return sendSuccess(res, 200, {
      message: 'Cotización restaurada',
      cotizacion: mapQuoteResponse(restored, cliente),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en restoreQuote');
    return sendError(res, 500, 'No se pudo restaurar la cotización');
  }
}
