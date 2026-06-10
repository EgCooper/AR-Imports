import dns from 'dns';

import 'dotenv/config';
import { MongoClient } from 'mongodb';

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
      console.log(`Conectado a MongoDB: ${db.databaseName}`);
    } catch (error) {
      const isSslError =
        error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' ||
        error.message?.includes('SSL');

      if (isSslError) {
        console.error(
          'Error al conectar con MongoDB: revisa en Atlas → Network Access que tu IP esté permitida (o usa 0.0.0.0/0 en desarrollo) y confirma que el cluster no esté pausado.'
        );
      }

      throw error;
    }
  }

  return db;
}

export { client };
