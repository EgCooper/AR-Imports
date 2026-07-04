import dns from 'dns';

import 'dotenv/config';
import { MongoClient } from 'mongodb';

import { logger } from '../utils/logger.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = process.env.DATABASE_URL;

if (!uri) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

const clientOptions = {
  serverSelectionTimeoutMS: 10000,
  autoSelectFamily: false,
};

const globalForMongo = globalThis;
const client = globalForMongo.mongoClient ?? new MongoClient(uri, clientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForMongo.mongoClient = client;
}

let db;

/**
 * Establece y reutiliza la conexión con MongoDB Atlas.
 * @returns {Promise<import('mongodb').Db>} Instancia de la base de datos conectada.
 */
export async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      db = client.db();
      logger.info({ database: db.databaseName }, 'Conectado a MongoDB');
    } catch (error) {
      const isSslError =
        error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
        error.message?.includes('SSL');

      if (isSslError) {
        logger.error(
          'Error SSL al conectar con MongoDB: revisa Network Access en Atlas y que el cluster no esté pausado'
        );
      }

      throw error;
    }
  }

  return db;
}

/**
 * Verifica conectividad con MongoDB mediante ping.
 * @returns {Promise<boolean>}
 */
export async function pingDB() {
  try {
    const database = await connectDB();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cierra la conexión con MongoDB de forma ordenada.
 */
export async function closeDB() {
  try {
    await client.close();
    logger.info('Conexión MongoDB cerrada');
  } catch (error) {
    logger.warn({ err: error }, 'Error al cerrar MongoDB');
    throw error;
  } finally {
    db = undefined;
  }
}

export { client };
