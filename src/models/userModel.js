import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'usuarios';

/**
 * Obtiene la referencia a la colección de usuarios.
 * @returns {Promise<import('mongodb').Collection>} Colección de usuarios.
 */
async function getUsersCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Busca un usuario registrado por su dirección de email.
 * @param {string} email - Email único del usuario.
 * @returns {Promise<object|null>} Documento del usuario o null si no existe.
 */
export async function findByEmail(email) {
  const collection = await getUsersCollection();
  return collection.findOne({ email });
}

/**
 * Persiste un nuevo usuario en la base de datos.
 * @param {object} userData - Datos del usuario a almacenar.
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 */
export async function createUser(userData) {
  const collection = await getUsersCollection();
  return collection.insertOne(userData);
}
