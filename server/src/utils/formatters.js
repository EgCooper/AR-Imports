import { ObjectId } from 'mongodb';

/**
 * Convierte ObjectId, string u objetos legacy a id string.
 * @param {unknown} value
 * @returns {string|null}
 */
export function toIdString(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === 'object' && value.$oid) return String(value.$oid);
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

/**
 * Formatea un documento MongoDB con `_id` a respuesta API con `id`.
 * @param {object|null|undefined} doc
 * @returns {object|null}
 */
export function formatDocument(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: toIdString(_id), ...rest };
}

/**
 * @param {object|null|undefined} doc
 */
export function formatClient(doc) {
  return formatDocument(doc);
}

/**
 * @param {object|null|undefined} doc
 */
export function formatPayment(doc) {
  if (!doc) return null;
  const { _id, clienteId, ...rest } = doc;
  return {
    id: toIdString(_id),
    clienteId: toIdString(clienteId),
    ...rest,
  };
}

/**
 * @param {object|null|undefined} doc
 */
export function formatPhoto(doc) {
  if (!doc) return null;
  const { _id, clienteId, ...rest } = doc;
  return {
    id: toIdString(_id),
    clienteId: toIdString(clienteId),
    ...rest,
  };
}

/**
 * @param {object|null|undefined} doc
 */
export function formatQuoteDocument(doc) {
  if (!doc) return null;
  const { _id, clienteId, ...rest } = doc;
  return {
    id: toIdString(_id),
    clienteId: clienteId ? toIdString(clienteId) : null,
    ...rest,
  };
}

/**
 * Referencia mínima de cliente en respuestas anidadas.
 * @param {object|null|undefined} doc
 */
export function formatClientRef(doc) {
  if (!doc) return null;
  return {
    id: toIdString(doc._id),
    nombreCompleto: doc.nombreCompleto,
  };
}

/**
 * @param {object|null|undefined} user
 */
export function formatUser(user) {
  if (!user) return null;
  return {
    id: toIdString(user._id),
    nombre: user.nombre,
    email: user.email,
  };
}

/**
 * @param {object[]|null|undefined} docs
 * @param {(doc: object) => object|null} formatter
 */
export function formatMany(docs, formatter) {
  if (!Array.isArray(docs)) return [];
  return docs.map((doc) => formatter(doc)).filter(Boolean);
}
