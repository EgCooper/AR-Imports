import {
  archiveClientById,
  createClient,
  findAllClients,
  findClientById,
  findClientsForExport,
  findClientsPaginated,
  restoreClientById,
  updateClientById,
  updateClientStatus,
} from '../models/clientModel.js';
import { addEstadoHistorialEntry, findEstadoHistorialByClientId } from '../models/estadoHistorialModel.js';
import { aggregatePaymentTotalsByClientIds } from '../models/paymentModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { buildCsv, sendCsvResponse } from '../utils/csvExport.js';
import { buildResumenFinanciero } from '../utils/financialSummary.js';
import { formatClient, formatMany } from '../utils/formatters.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { isAllowedUploadUrl, toNonNegativeNumber } from '../utils/validators.js';

const ESTADOS_VALIDOS = ['USA', 'CHILE', 'ADUANA_BOLIVIA', 'BOLIVIA', 'TALLER'];

function parseClientListQuery(query) {
  const estadoAuto = query.estado?.toUpperCase();
  const search = query.search?.trim() || undefined;
  const fechaDesde = query.fechaDesde?.trim() || undefined;
  const fechaHasta = query.fechaHasta?.trim() || undefined;
  const incluirArchivados = query.incluirArchivados === 'true';

  return { estadoAuto, search, fechaDesde, fechaHasta, incluirArchivados };
}

function validateClientBody(body, res, { requireAll = true } = {}) {
  const {
    nombreCompleto,
    telefono,
    vin,
    lote,
    costoTotalPactado,
    estadoAuto,
    fotoAutoUrl,
  } = body;

  if (requireAll && (!nombreCompleto || !telefono || !vin || !lote || costoTotalPactado === undefined)) {
    sendError(
      res,
      400,
      'Los campos nombreCompleto, telefono, vin, lote y costoTotalPactado son requeridos'
    );
    return null;
  }

  const costo = costoTotalPactado !== undefined ? toNonNegativeNumber(costoTotalPactado) : undefined;
  if (costoTotalPactado !== undefined && costo === null) {
    sendError(res, 400, 'costoTotalPactado debe ser un número mayor o igual a 0');
    return null;
  }

  if (estadoAuto && !ESTADOS_VALIDOS.includes(estadoAuto)) {
    sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    return null;
  }

  if (fotoAutoUrl && !isAllowedUploadUrl(fotoAutoUrl)) {
    sendError(res, 400, 'fotoAutoUrl no es una URL de archivo válida');
    return null;
  }

  return {
    nombreCompleto: nombreCompleto != null ? String(nombreCompleto).trim() : undefined,
    telefono: telefono != null ? String(telefono).trim() : undefined,
    vehiculo: body.vehiculo,
    vin: vin != null ? String(vin).trim() : undefined,
    lote: lote != null ? String(lote).trim() : undefined,
    fotoAutoUrl,
    costoTotalPactado: costo,
    estadoAuto,
  };
}

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
    const fields = validateClientBody(req.body, res);
    if (!fields) return;

    const resultado = await createClient({
      ...fields,
      vehiculo: fields.vehiculo,
      estadoAuto: fields.estadoAuto,
    });

    const clientId = resultado.insertedId.toString();
    await addEstadoHistorialEntry({
      clienteId: clientId,
      estadoAnterior: null,
      estadoNuevo: fields.estadoAuto ?? 'USA',
      notas: 'Registro inicial del cliente',
      usuarioId: req.user?.id,
    });

    return sendSuccess(res, 201, {
      id: clientId,
      ...fields,
      vehiculo: fields.vehiculo?.trim() || null,
      estadoAuto: fields.estadoAuto ?? 'USA',
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
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const filters = parseClientListQuery(req.query);

    if (filters.estadoAuto && !ESTADOS_VALIDOS.includes(filters.estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    if (hasPagination) {
      const { page, limit, skip } = parsePagination(req.query);
      const { clients, total } = await findClientsPaginated({ skip, limit, ...filters });
      const formatted = includeFinanciero
        ? await attachFinancialSummaries(clients)
        : formatClients(clients);

      return sendSuccess(res, 200, {
        items: formatted,
        pagination: buildPaginationMeta(page, limit, total),
      });
    }

    let clients;
    if (filters.estadoAuto || filters.search || filters.fechaDesde || filters.fechaHasta) {
      ({ clients } = await findClientsPaginated({
        skip: 0,
        limit: 10_000,
        ...filters,
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
 * Exporta clientes filtrados a CSV.
 */
export async function exportClientsCsv(req, res) {
  try {
    const filters = parseClientListQuery(req.query);

    if (filters.estadoAuto && !ESTADOS_VALIDOS.includes(filters.estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const clients = await findClientsForExport(filters);
    const withSummary = await attachFinancialSummaries(clients);

    const csv = buildCsv(withSummary, [
      { header: 'Nombre', value: (row) => row.nombreCompleto },
      { header: 'Telefono', value: (row) => row.telefono },
      { header: 'VIN', value: (row) => row.vin },
      { header: 'Lote', value: (row) => row.lote },
      { header: 'Vehiculo', value: (row) => row.vehiculo ?? '' },
      { header: 'Estado', value: (row) => row.estadoAuto },
      { header: 'Costo pactado USD', value: (row) => row.costoTotalPactado ?? 0 },
      { header: 'Total pagado USD', value: (row) => row.resumenFinanciero?.totalPagado ?? 0 },
      { header: 'Saldo pendiente USD', value: (row) => row.resumenFinanciero?.saldoPendiente ?? 0 },
      { header: 'Fecha registro', value: (row) => row.fechaRegistro ?? '' },
    ]);

    return sendCsvResponse(res, 'clientes-arr-imports.csv', csv);
  } catch (_error) {
    return sendError(res, 500, 'No se pudo exportar la lista de clientes');
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

    const previous = await updateClientStatus(id, estadoAuto);
    if (!previous) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    if (previous.estadoAuto !== estadoAuto) {
      await addEstadoHistorialEntry({
        clienteId: id,
        estadoAnterior: previous.estadoAuto ?? null,
        estadoNuevo: estadoAuto,
        usuarioId: req.user?.id,
      });
    }

    return sendSuccess(res, 200, { id, estadoAuto });
  } catch (_error) {
    return sendError(res, 400, 'Identificador de cliente inválido');
  }
}

/**
 * Actualiza datos generales del cliente (F4).
 */
export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const fields = validateClientBody(req.body, res);
    if (!fields) return;

    const updated = await updateClientById(id, fields);
    if (!updated) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    return sendSuccess(res, 200, formatClient(updated));
  } catch (_error) {
    return sendError(res, 400, 'No se pudo actualizar el cliente');
  }
}

/**
 * Archiva un cliente (F5).
 */
export async function archiveClient(req, res) {
  try {
    const { id } = req.params;
    const { motivo, forzar } = req.body ?? {};

    const cliente = await findClientById(id);
    if (!cliente || cliente.archivado) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const totalsMap = await aggregatePaymentTotalsByClientIds([id]);
    const totalPagado = totalsMap.get(id) ?? 0;
    const saldo = Math.max((cliente.costoTotalPactado ?? 0) - totalPagado, 0);

    if (saldo > 0 && !forzar) {
      return sendError(
        res,
        409,
        `El cliente tiene saldo pendiente de $${saldo.toFixed(2)}. Confirma forzar para archivar.`
      );
    }

    const archived = await archiveClientById(id, motivo);
    return sendSuccess(res, 200, formatClient(archived));
  } catch (_error) {
    return sendError(res, 400, 'No se pudo archivar el cliente');
  }
}

/**
 * Restaura un cliente archivado (F5).
 */
export async function restoreClient(req, res) {
  try {
    const { id } = req.params;
    const restored = await restoreClientById(id);
    if (!restored) {
      return sendError(res, 404, 'Cliente archivado no encontrado');
    }
    return sendSuccess(res, 200, formatClient(restored));
  } catch (_error) {
    return sendError(res, 400, 'No se pudo restaurar el cliente');
  }
}

/**
 * Historial de cambios de estado (F7).
 */
export async function getClientTimeline(req, res) {
  try {
    const { id } = req.params;
    const cliente = await findClientById(id);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const historial = await findEstadoHistorialByClientId(id);
    const items = historial.map((entry) => ({
      id: entry._id.toString(),
      estadoAnterior: entry.estadoAnterior,
      estadoNuevo: entry.estadoNuevo,
      fechaCambio: entry.fechaCambio,
      notas: entry.notas,
    }));

    return sendSuccess(res, 200, { cliente: formatClient(cliente), historial: items });
  } catch (_error) {
    return sendError(res, 400, 'No se pudo obtener el historial');
  }
}
