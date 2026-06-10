import dns from 'dns';

import 'dotenv/config';
import { MongoClient } from 'mongodb';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = process.env.DATABASE_URL;

if (!uri) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

const globalForMongo = globalThis;
const client = globalForMongo.mongoClient ?? new MongoClient(uri);

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
    await client.connect();
    db = client.db();
    console.log(`Conectado a MongoDB: ${db.databaseName}`);
  }

  return db;
}

export { client };
