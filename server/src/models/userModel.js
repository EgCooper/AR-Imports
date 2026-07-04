import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

import { normalizeEmail } from '../utils/validators.js';

const COLLECTION_NAME = 'usuarios';

/**
 * Obtiene la referencia a la colección de usuarios.
 * @returns {Promise<import('mongodb').Collection>} Colección de usuarios.
 */
async function getUsersCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

const EMAIL_COLLATION = { locale: 'en', strength: 2 };

/**
 * Crea el índice único de email (idempotente, case-insensitive).
 */
export async function ensureUserIndexes() {
  const collection = await getUsersCollection();
  try {
    await collection.createIndex(
      { email: 1 },
      { unique: true, name: 'usuarios_email_unique', collation: EMAIL_COLLATION }
    );
  } catch (error) {
    logger.warn({ err: error }, 'Índice de email en usuarios');
  }
}

/**
 * Busca un usuario registrado por su dirección de email.
 * @param {string} email - Email único del usuario.
 * @returns {Promise<object|null>} Documento del usuario o null si no existe.
 */
export async function findByEmail(email) {
  const collection = await getUsersCollection();
  return collection.findOne(
    { email: normalizeEmail(email) },
    { collation: EMAIL_COLLATION }
  );
}

export async function findById(id) {
  const collection = await getUsersCollection();
  const idStr = String(id ?? '').trim();
  if (!/^[a-f\d]{24}$/i.test(idStr)) return null;
  return collection.findOne({ _id: new ObjectId(idStr) });
}

/**
 * Persiste un nuevo usuario en la base de datos.
 * @param {object} userData - Datos del usuario a almacenar.
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 */
export async function createUser(userData) {
  const collection = await getUsersCollection();
  return collection.insertOne({
    ...userData,
    email: normalizeEmail(userData.email),
  });
}
