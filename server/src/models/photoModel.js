import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'fotos_logistica';

/**
 * Estados logísticos válidos del vehículo.
 * @type {string[]}
 */
export const ESTADOS_VALIDOS = ['USA', 'CHILE', 'ADUANA_BOLIVIA', 'BOLIVIA', 'TALLER'];

/**
 * Obtiene la referencia a la colección de fotos logísticas.
 * @returns {Promise<import('mongodb').Collection>} Colección de fotos logísticas.
 */
async function getPhotosCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Registra una nueva foto en el historial logístico de un cliente.
 * @param {object} photoData - Datos de la foto.
 * @param {string} photoData.clienteId - Identificador del cliente (string convertido a ObjectId).
 * @param {string} photoData.estadoAlMomento - Estado del vehículo al momento de la foto.
 * @param {string} photoData.fotoUrl - URL de la imagen almacenada.
 * @param {Date|string} [photoData.fechaSubida] - Fecha de subida (por defecto la fecha actual).
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 * @throws {Error} Si el estado logístico no es válido.
 */
export async function addPhotoLog(photoData) {
  if (!ESTADOS_VALIDOS.includes(photoData.estadoAlMomento)) {
    throw new Error(`Estado logístico inválido: ${photoData.estadoAlMomento}`);
  }

  const collection = await getPhotosCollection();

  const nuevaFoto = {
    clienteId: new ObjectId(photoData.clienteId),
    estadoAlMomento: photoData.estadoAlMomento,
    fotoUrl: photoData.fotoUrl,
    fechaSubida: photoData.fechaSubida ? new Date(photoData.fechaSubida) : new Date(),
  };

  return collection.insertOne(nuevaFoto);
}

/**
 * Recupera todas las fotos logísticas de un cliente ordenadas de la más reciente a la más antigua.
 * @param {string} clientId - Identificador del cliente (string convertido a ObjectId).
 * @returns {Promise<object[]>} Arreglo de fotos del cliente.
 */
export async function findPhotosByClientId(clientId) {
  const collection = await getPhotosCollection();

  return collection
    .find({ clienteId: new ObjectId(clientId) })
    .sort({ fechaSubida: -1 })
    .toArray();
}

/**
 * Crea índices para consultas frecuentes sobre fotos logísticas.
 */
export async function ensurePhotoIndexes() {
  const collection = await getPhotosCollection();
  await collection.createIndex({ clienteId: 1, fechaSubida: -1 });
}
