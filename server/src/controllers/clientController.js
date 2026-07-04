import {
  createClient,
  findAllClients,
  findClientById,
  findClientsPaginated,
  updateClientStatus,
} from '../models/clientModel.js';
import { aggregatePaymentTotalsByClientIds } from '../models/paymentModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { buildResumenFinanciero } from '../utils/financialSummary.js';
import { formatClient, formatMany } from '../utils/formatters.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { isAllowedUploadUrl, toNonNegativeNumber } from '../utils/validators.js';

const ESTADOS_VALIDOS = ['USA', 'CHILE', 'ADUANA_BOLIVIA', 'BOLIVIA', 'TALLER'];

async function attachFinancialSummaries(clients) {
  if (!clients.length) return clients;

  const totalsMap = await aggregatePaymentTotalsByClientIds(clients.map((c) => c._id.toString()));

  return clients.map((client) => {
    const costoTotalPactado = client.costoTotalPactado ?? 0;
    const totalPagado = totalsMap.get(client._id.toString()) ?? 0;
    return {
      ...formatClient(client),
      resumenFinanciero: buildResumenFinanciero(costoTotalPactado, totalPagado),
    };
  });
}

function formatClients(clients) {
  return formatMany(clients, formatClient);
}

/**
 * Registra un nuevo cliente con su vehículo asociado.
 * @param {import('express').Request} req - Petición con los datos del cliente en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function registerClient(req, res) {
  try {
    const {
      nombreCompleto,
      telefono,
      vehiculo,
      vin,
      lote,
      fotoAutoUrl,
      costoTotalPactado,
      estadoAuto,
    } = req.body;

    if (!nombreCompleto || !telefono || !vin || !lote || costoTotalPactado === undefined) {
      return sendError(
        res,
        400,
        'Los campos nombreCompleto, telefono, vin, lote y costoTotalPactado son requeridos'
      );
    }

    const costo = toNonNegativeNumber(costoTotalPactado);
    if (costo === null) {
      return sendError(res, 400, 'costoTotalPactado debe ser un número mayor o igual a 0');
    }

    if (estadoAuto && !ESTADOS_VALIDOS.includes(estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    if (fotoAutoUrl && !isAllowedUploadUrl(fotoAutoUrl)) {
      return sendError(res, 400, 'fotoAutoUrl no es una URL de archivo válida');
    }

    const resultado = await createClient({
      nombreCompleto: String(nombreCompleto).trim(),
      telefono: String(telefono).trim(),
      vehiculo,
      vin: String(vin).trim(),
      lote: String(lote).trim(),
      fotoAutoUrl,
      costoTotalPactado: costo,
      estadoAuto,
    });

    return sendSuccess(res, 201, {
      id: resultado.insertedId.toString(),
      nombreCompleto: String(nombreCompleto).trim(),
      telefono: String(telefono).trim(),
      vehiculo: vehiculo ?? null,
      vin: String(vin).trim(),
      lote: String(lote).trim(),
      fotoAutoUrl: fotoAutoUrl ?? null,
      costoTotalPactado: costo,
      estadoAuto: estadoAuto ?? 'USA',
    });
  } catch (_error) {
    return sendError(res, 500, 'Error al registrar el cliente');
  }
}

/**
 * Obtiene la lista completa de clientes registrados.
 * @param {import('express').Request} req - Petición HTTP.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getAllClients(req, res) {
  try {
    const includeFinanciero = req.query.includeFinanciero === 'true';
    const estadoAuto = req.query.estado?.toUpperCase();
    const search = req.query.search?.trim() || undefined;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

    if (estadoAuto && !ESTADOS_VALIDOS.includes(estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    if (hasPagination) {
      const { page, limit, skip } = parsePagination(req.query);
      const { clients, total } = await findClientsPaginated({ skip, limit, estadoAuto, search });
      const formatted = includeFinanciero
        ? await attachFinancialSummaries(clients)
        : formatClients(clients);

      return sendSuccess(res, 200, {
        items: formatted,
        pagination: buildPaginationMeta(page, limit, total),
      });
    }

    let clients;
    if (estadoAuto) {
      ({ clients } = await findClientsPaginated({
        skip: 0,
        limit: 10_000,
        estadoAuto,
        search,
      }));
    } else {
      clients = await findAllClients();
    }

    const formatted = includeFinanciero
      ? await attachFinancialSummaries(clients)
      : formatClients(clients);

    return sendSuccess(res, 200, formatted);
  } catch (_error) {
    return sendError(res, 500, 'Error al obtener los clientes');
  }
}

/**
 * Obtiene un cliente específico por su identificador.
 * @param {import('express').Request} req - Petición con el id en los parámetros de la URL.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getClientById(req, res) {
  try {
    const { id } = req.params;

    const cliente = await findClientById(id);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    return sendSuccess(res, 200, formatClient(cliente));
  } catch (_error) {
    return sendError(res, 400, 'Identificador de cliente inválido');
  }
}

/**
 * Actualiza el estado del vehículo de un cliente.
 * @param {import('express').Request} req - Petición con el id en la URL y estadoAuto en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { estadoAuto } = req.body;

    if (!estadoAuto || !ESTADOS_VALIDOS.includes(estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const resultado = await updateClientStatus(id, estadoAuto);
    if (resultado.matchedCount === 0) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    return sendSuccess(res, 200, { id, estadoAuto });
  } catch (_error) {
    return sendError(res, 400, 'Identificador de cliente inválido');
  }
}
