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
    datosVehiculo: Number(quoteData.datosVehiculo),
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
