import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'estado_historial';

async function getCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * @param {{ clienteId: string, estadoAnterior: string|null, estadoNuevo: string, notas?: string, usuarioId?: string }} entry
 */
export async function addEstadoHistorialEntry({ clienteId, estadoAnterior, estadoNuevo, notas, usuarioId }) {
  const collection = await getCollection();

  return collection.insertOne({
    clienteId: new ObjectId(clienteId),
    estadoAnterior: estadoAnterior ?? null,
    estadoNuevo,
    notas: notas?.trim() || null,
    usuarioId: usuarioId ? new ObjectId(usuarioId) : null,
    fechaCambio: new Date(),
  });
}

/**
 * @param {string} clientId
 */
export async function findEstadoHistorialByClientId(clientId) {
  const collection = await getCollection();

  return collection
    .find({ clienteId: new ObjectId(clientId) })
    .sort({ fechaCambio: -1 })
    .toArray();
}

export async function ensureEstadoHistorialIndexes() {
  const collection = await getCollection();
  await collection.createIndex({ clienteId: 1, fechaCambio: -1 });
}
