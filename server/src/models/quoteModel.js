import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'cotizaciones';

/**
 * Obtiene la referencia a la colección de cotizaciones de vehículos.
 * @returns {Promise<import('mongodb').Collection>} Colección de cotizaciones.
 */
async function getQuotesCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Mapea y normaliza los campos financieros de una cotización.
 * @param {object} quoteData - Datos crudos de la cotización.
 * @returns {object} Documento con tipos de datos correctos.
 */
function mapQuoteData(quoteData) {
  return {
    totalVehiculo: Number(quoteData.totalVehiculo),
    datosVehiculo: String(quoteData.datosVehiculo ?? '').trim(),
    fees: Number(quoteData.fees),
    tarifaUsa: Number(quoteData.tarifaUsa),
    transferenciaDineroUsa: Number(quoteData.transferenciaDineroUsa),
    comisionTresPorcento: Number(quoteData.comisionTresPorcento),
    transporte: Number(quoteData.transporte),
    guiaParaRecoger: Number(quoteData.guiaParaRecoger),
    comisionImportador: Number(quoteData.comisionImportador),
    documentoIngreso: Number(quoteData.documentoIngreso),
    chaperia: Number(quoteData.chaperia),
    pintura: Number(quoteData.pintura),
    repuestos: Number(quoteData.repuestos),
    poliza: Number(quoteData.poliza),
    tramitesAduana: Number(quoteData.tramitesAduana),
    marca: quoteData.marca?.trim() || null,
    modelo: quoteData.modelo?.trim() || null,
    ano: quoteData.ano ? Number(quoteData.ano) : null,
    tipoVehiculo: quoteData.tipoVehiculo || null,
  };
}

/**
 * Crea o actualiza la cotización de un cliente (relación 1:1).
 * Si ya existe una cotización para el clientId, la actualiza con $set.
 * Si no existe, la crea con clienteId y fechaCreacion.
 * @param {string} clientId - Identificador del cliente (string convertido a ObjectId).
 * @param {object} quoteData - Datos financieros de la cotización.
 * @returns {Promise<import('mongodb').InsertOneResult|import('mongodb').UpdateResult>} Resultado de la operación.
 */
export async function createOrUpdateQuote(clientId, quoteData) {
  const collection = await getQuotesCollection();
  const clienteId = new ObjectId(clientId);
  const mappedData = mapQuoteData(quoteData);

  const existing = await collection.findOne({ clienteId });

  if (existing) {
    return collection.updateOne({ clienteId }, { $set: mappedData });
  }

  return collection.insertOne({
    clienteId,
    ...mappedData,
    fechaCreacion: new Date(),
  });
}

/**
 * Busca la cotización asociada a un cliente específico.
 * @param {string} clientId - Identificador del cliente (string convertido a ObjectId).
 * @returns {Promise<object|null>} Documento de la cotización o null si no existe.
 */
export async function findQuoteByClientId(clientId) {
  const collection = await getQuotesCollection();

  return collection.findOne({ clienteId: new ObjectId(clientId) });
}

/**
 * Busca una cotización por su identificador de documento.
 * @param {string} quoteId - Identificador de la cotización.
 * @returns {Promise<object|null>} Documento de la cotización o null.
 */
export async function findQuoteById(quoteId) {
  const collection = await getQuotesCollection();
  return collection.findOne({ _id: new ObjectId(quoteId) });
}

/**
 * Lista todas las cotizaciones con datos del cliente asociado (si existe).
 * @returns {Promise<object[]>} Cotizaciones ordenadas por fecha de creación descendente.
 */
export async function findAllQuotes() {
  const collection = await getQuotesCollection();

  return collection
    .aggregate([
      {
        $lookup: {
          from: 'Cliente',
          localField: 'clienteId',
          foreignField: '_id',
          as: 'cliente',
        },
      },
      { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
      { $sort: { fechaCreacion: -1 } },
    ])
    .toArray();
}

/**
 * Crea una cotización independiente (sin cliente obligatorio).
 * @param {object} quoteData - Datos financieros de la cotización.
 * @param {string|null} [clientId] - Cliente opcional al que vincular la cotización.
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 */
export async function createQuote(quoteData, clientId = null) {
  const collection = await getQuotesCollection();
  const mappedData = mapQuoteData(quoteData);

  const document = {
    ...mappedData,
    fechaCreacion: new Date(),
  };

  if (clientId) {
    document.clienteId = new ObjectId(clientId);
  }

  return collection.insertOne(document);
}

/**
 * Actualiza una cotización existente por su identificador de documento.
 * @param {string} quoteId - Identificador de la cotización.
 * @param {object} quoteData - Datos financieros actualizados.
 * @returns {Promise<import('mongodb').UpdateResult|null>} Resultado o null si no existe.
 */
export async function updateQuoteById(quoteId, quoteData) {
  const collection = await getQuotesCollection();
  const mappedData = mapQuoteData(quoteData);

  const result = await collection.updateOne(
    { _id: new ObjectId(quoteId) },
    { $set: mappedData }
  );

  return result.matchedCount > 0 ? result : null;
}
