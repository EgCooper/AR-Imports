import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

const COLLECTION_NAME = 'refresh_tokens';

async function getCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

export async function ensureRefreshTokenIndexes() {
  const collection = await getCollection();
  try {
    await collection.createIndex({ jti: 1 }, { unique: true, name: 'refresh_jti_unique' });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'refresh_ttl' });
  } catch (error) {
    logger.warn({ err: error }, 'Índices refresh_tokens');
  }
}

/**
 * @param {string} jti
 * @param {string} userId
 * @param {Date} expiresAt
 */
export async function storeRefreshJti(jti, userId, expiresAt) {
  const collection = await getCollection();
  await collection.insertOne({
    jti,
    userId: new ObjectId(userId),
    expiresAt,
    createdAt: new Date(),
  });
}

/**
 * @param {string} jti
 * @returns {Promise<object|null>}
 */
export async function consumeRefreshJti(jti) {
  const collection = await getCollection();
  return collection.findOneAndDelete({ jti });
}

/**
 * @param {string} jti
 */
export async function revokeRefreshJti(jti) {
  const collection = await getCollection();
  await collection.deleteOne({ jti });
}
