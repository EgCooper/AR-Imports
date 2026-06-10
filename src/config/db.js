import { connectDB } from './mongo.js';

/**
 * Obtiene la instancia activa de la base de datos MongoDB.
 * @returns {Promise<import('mongodb').Db>} Instancia de la base de datos conectada.
 */
export async function getDB() {
  return connectDB();
}
