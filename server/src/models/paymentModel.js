import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'Pago';

/**
 * Conceptos de pago válidos dentro del sistema.
 * @type {string[]}
 */
export const CONCEPTOS_VALIDOS = [
  'PAGO_INICIAL',
  'RESERVA',
  'ABONO_SUBASTA',
  'PAGO_FLETE',
  'TRANSPORTE_PAGO',
  'TRAMITES',
  'REPARACIONES',
  'REPUESTOS',
  'OTRO',
];

/**
 * Obtiene la referencia a la colección de pagos.
 * @returns {Promise<import('mongodb').Collection>} Colección de pagos.
 */
async function getPaymentsCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Inserta un nuevo pago o abono asociado a un cliente.
 * @param {object} paymentData - Datos del pago.
 * @param {string} paymentData.clienteId - Identificador del cliente (string convertido a ObjectId).
 * @param {number} paymentData.monto - Monto del pago.
 * @param {Date|string} [paymentData.fechaAbono] - Fecha del abono (por defecto la fecha actual).
 * @param {string} paymentData.concepto - Concepto del pago (debe ser uno de CONCEPTOS_VALIDOS).
 * @param {string} paymentData.metodoPago - Método de pago (Efectivo, QR, Otro).
 * @param {string} [paymentData.comprobanteUrl] - URL del comprobante (opcional).
 * @param {string} [paymentData.notas] - Notas adicionales (opcional).
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 * @throws {Error} Si el concepto no es válido.
 */
export async function createPayment(paymentData) {
  if (!CONCEPTOS_VALIDOS.includes(paymentData.concepto)) {
    throw new Error(`Concepto de pago inválido: ${paymentData.concepto}`);
  }

  const collection = await getPaymentsCollection();

  const nuevoPago = {
    clienteId: new ObjectId(paymentData.clienteId),
    monto: paymentData.monto,
    fechaAbono: paymentData.fechaAbono ? new Date(paymentData.fechaAbono) : new Date(),
    concepto: paymentData.concepto,
    metodoPago: paymentData.metodoPago,
    comprobanteUrl: paymentData.comprobanteUrl ?? null,
    notas: paymentData.notas ?? null,
  };

  return collection.insertOne(nuevoPago);
}

/**
 * Recupera todos los pagos de un cliente ordenados del más reciente al más antiguo.
 * @param {string} clientId - Identificador del cliente (string convertido a ObjectId).
 * @returns {Promise<object[]>} Arreglo de pagos del cliente.
 */
export async function findPaymentsByClientId(clientId) {
  const collection = await getPaymentsCollection();

  return collection
    .find({ clienteId: new ObjectId(clientId) })
    .sort({ fechaAbono: -1 })
    .toArray();
}

/**
 * Suma los pagos por cliente en una sola consulta de agregación.
 * @param {string[]} clientIds - Identificadores de clientes.
 * @returns {Promise<Map<string, number>>} Mapa clienteId → total pagado.
 */
export async function aggregatePaymentTotalsByClientIds(clientIds) {
  if (!clientIds.length) return new Map();

  const objectIds = clientIds.map((id) => new ObjectId(id));
  const collection = await getPaymentsCollection();

  const rows = await collection
    .aggregate([
      { $match: { clienteId: { $in: objectIds } } },
      { $group: { _id: '$clienteId', totalPagado: { $sum: '$monto' } } },
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id.toString(), row.totalPagado]));
}

/**
 * Crea índices para consultas frecuentes sobre pagos.
 */
export async function ensurePaymentIndexes() {
  const collection = await getPaymentsCollection();
  await collection.createIndex({ clienteId: 1 });
  await collection.createIndex({ fechaAbono: -1 });
}
