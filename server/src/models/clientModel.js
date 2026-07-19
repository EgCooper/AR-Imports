import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';
import { sanitizeSearchTerm } from '../utils/search.js';

const COLLECTION_NAME = 'Cliente';
const SEARCH_MAX_TIME_MS = Number(process.env.CLIENT_SEARCH_MAX_TIME_MS || 2000);

/**
 * Obtiene la referencia a la colección de clientes.
 * @returns {Promise<import('mongodb').Collection>} Colección de clientes.
 */
async function getClientsCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Inserta un nuevo cliente en la base de datos.
 * @param {object} clientData - Datos del cliente.
 * @param {string} clientData.nombreCompleto - Nombre completo del cliente.
 * @param {string} clientData.telefono - Teléfono de contacto.
 * @param {string} clientData.vin - Número VIN del vehículo.
 * @param {string} clientData.lote - Número de lote.
 * @param {string} [clientData.fotoAutoUrl] - URL de la foto del vehículo (opcional).
 * @param {number} clientData.costoTotalPactado - Costo total acordado.
 * @param {string} [clientData.estadoAuto='USA'] - Estado del vehículo (USA, CHILE, ADUANA_BOLIVIA, TALLER).
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 */
export async function createClient(clientData) {
  const collection = await getClientsCollection();

  const nuevoCliente = {
    nombreCompleto: clientData.nombreCompleto,
    telefono: clientData.telefono,
    vehiculo: clientData.vehiculo?.trim() || null,
    vin: clientData.vin,
    lote: clientData.lote,
    fotoAutoUrl: clientData.fotoAutoUrl ?? null,
    costoTotalPactado: clientData.costoTotalPactado,
    estadoAuto: clientData.estadoAuto ?? 'USA',
    fechaRegistro: new Date(),
    archivado: false,
    fechaArchivado: null,
    motivoArchivado: null,
    cotizacionOrigenId: clientData.cotizacionOrigenId
      ? new ObjectId(clientData.cotizacionOrigenId)
      : null,
  };

  return collection.insertOne(nuevoCliente);
}

/**
 * Recupera la lista completa de clientes registrados.
 * @returns {Promise<object[]>} Arreglo con todos los clientes.
 */
export async function findAllClients() {
  const collection = await getClientsCollection();
  return collection.find().sort({ fechaRegistro: -1 }).toArray();
}

/**
 * Construye filtro de búsqueda por nombre, VIN, lote o vehículo.
 * Escapa metacaracteres regex y limita longitud (anti ReDoS).
 * @param {string|undefined} search
 */
function buildSearchFilter(search) {
  const term = sanitizeSearchTerm(search);
  if (!term) return {};

  const regex = { $regex: term, $options: 'i' };
  return {
    $or: [
      { nombreCompleto: regex },
      { telefono: regex },
      { vin: regex },
      { lote: regex },
      { vehiculo: regex },
    ],
  };
}

/**
 * @param {string|undefined} fechaDesde ISO date string YYYY-MM-DD
 * @param {string|undefined} fechaHasta ISO date string YYYY-MM-DD
 */
function buildDateFilter(fechaDesde, fechaHasta) {
  if (!fechaDesde && !fechaHasta) return {};

  const range = {};
  if (fechaDesde) {
    range.$gte = new Date(`${fechaDesde}T00:00:00.000Z`);
  }
  if (fechaHasta) {
    range.$lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  }

  return { fechaRegistro: range };
}

/**
 * @param {{ estadoAuto?: string, search?: string, fechaDesde?: string, fechaHasta?: string, incluirArchivados?: boolean }} filters
 */
export function buildClientFilter({ estadoAuto, search, fechaDesde, fechaHasta, incluirArchivados = false }) {
  return {
    ...(incluirArchivados ? {} : { archivado: { $ne: true } }),
    ...(estadoAuto ? { estadoAuto } : {}),
    ...buildSearchFilter(search),
    ...buildDateFilter(fechaDesde, fechaHasta),
  };
}

/**
 * Lista clientes con paginación, filtro opcional por estado y búsqueda.
 * @param {{ skip: number, limit: number, estadoAuto?: string, search?: string, fechaDesde?: string, fechaHasta?: string, incluirArchivados?: boolean }} options
 * @returns {Promise<{ clients: object[], total: number }>}
 */
export async function findClientsPaginated({ skip, limit, estadoAuto, search, fechaDesde, fechaHasta, incluirArchivados }) {
  const collection = await getClientsCollection();
  const filter = buildClientFilter({ estadoAuto, search, fechaDesde, fechaHasta, incluirArchivados });

  const [clients, total] = await Promise.all([
    collection
      .find(filter)
      .maxTimeMS(SEARCH_MAX_TIME_MS)
      .sort({ fechaRegistro: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: SEARCH_MAX_TIME_MS }),
  ]);

  return { clients, total };
}

/**
 * Lista clientes sin paginación para exportación (máximo 10 000).
 * @param {object} filters
 * @returns {Promise<object[]>}
 */
export async function findClientsForExport(filters, maxRows = 10_000) {
  const collection = await getClientsCollection();
  const filter = buildClientFilter(filters);

  return collection
    .find(filter)
    .maxTimeMS(SEARCH_MAX_TIME_MS * 5)
    .sort({ fechaRegistro: -1 })
    .limit(maxRows)
    .toArray();
}

/**
 * Crea índices para consultas frecuentes sobre clientes.
 */
export async function ensureClientIndexes() {
  const collection = await getClientsCollection();
  await collection.createIndex({ estadoAuto: 1, fechaRegistro: -1 });
  await collection.createIndex({ vin: 1 });
  await collection.createIndex({ fechaRegistro: -1 });
  await collection.createIndex({ archivado: 1, fechaRegistro: -1 });
  await collection.createIndex({ nombreCompleto: 1 });
  await collection.createIndex({ lote: 1 });
}

/**
 * Busca un cliente específico por su identificador.
 * @param {string} id - Identificador del cliente en formato string.
 * @returns {Promise<object|null>} Documento del cliente o null si no existe.
 */
export async function findClientById(id) {
  const collection = await getClientsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Actualiza únicamente el estado del vehículo de un cliente.
 * @param {string} id - Identificador del cliente en formato string.
 * @param {('USA'|'CHILE'|'ADUANA_BOLIVIA'|'TALLER')} newStatus - Nuevo estado del vehículo.
 * @returns {Promise<import('mongodb').UpdateResult>} Resultado de la actualización.
 */
export async function updateClientStatus(id, newStatus) {
  const collection = await getClientsCollection();

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), archivado: { $ne: true } },
    { $set: { estadoAuto: newStatus, updatedAt: new Date() } },
    { returnDocument: 'before' }
  );
}

/**
 * @param {string} id
 * @param {object} fields
 */
export async function updateClientById(id, fields) {
  const collection = await getClientsCollection();

  const update = {
    nombreCompleto: fields.nombreCompleto,
    telefono: fields.telefono,
    vehiculo: fields.vehiculo?.trim() || null,
    vin: fields.vin,
    lote: fields.lote,
    costoTotalPactado: fields.costoTotalPactado,
    updatedAt: new Date(),
  };

  if (fields.fotoAutoUrl !== undefined) {
    update.fotoAutoUrl = fields.fotoAutoUrl;
  }

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), archivado: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' }
  );
}

/**
 * @param {string} id
 * @param {string} [motivo]
 */
export async function archiveClientById(id, motivo = null) {
  const collection = await getClientsCollection();

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), archivado: { $ne: true } },
    {
      $set: {
        archivado: true,
        fechaArchivado: new Date(),
        motivoArchivado: motivo?.trim() || null,
      },
    },
    { returnDocument: 'after' }
  );
}

/**
 * @param {string} id
 */
export async function restoreClientById(id) {
  const collection = await getClientsCollection();

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), archivado: true },
    {
      $set: { archivado: false },
      $unset: { fechaArchivado: '', motivoArchivado: '' },
    },
    { returnDocument: 'after' }
  );
}
