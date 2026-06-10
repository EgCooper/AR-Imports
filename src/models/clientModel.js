import { ObjectId } from 'mongodb';

import { getDB } from '../config/db.js';

const COLLECTION_NAME = 'Cliente';

/**
 * Obtiene la referencia a la colección de clientes.
 * @returns {Promise<import('mongodb').Collection>} Colección de clientes.
 */
async function getClientsCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

/**
 * Inserta un nuevo cliente en la base de datos.
 * @param {object} clientData - Datos del cliente.
 * @param {string} clientData.nombreCompleto - Nombre completo del cliente.
 * @param {string} clientData.telefono - Teléfono de contacto.
 * @param {string} clientData.vin - Número VIN del vehículo.
 * @param {string} clientData.lote - Número de lote.
 * @param {string} [clientData.fotoAutoUrl] - URL de la foto del vehículo (opcional).
 * @param {number} clientData.costoTotalPactado - Costo total acordado.
 * @param {string} [clientData.estadoAuto='USA'] - Estado del vehículo (USA, CHILE, ADUANA_BOLIVIA, TALLER).
 * @returns {Promise<import('mongodb').InsertOneResult>} Resultado de la inserción.
 */
export async function createClient(clientData) {
  const collection = await getClientsCollection();

  const nuevoCliente = {
    nombreCompleto: clientData.nombreCompleto,
    telefono: clientData.telefono,
    vin: clientData.vin,
    lote: clientData.lote,
    fotoAutoUrl: clientData.fotoAutoUrl ?? null,
    costoTotalPactado: clientData.costoTotalPactado,
    estadoAuto: clientData.estadoAuto ?? 'USA',
    fechaRegistro: new Date(),
  };

  return collection.insertOne(nuevoCliente);
}

/**
 * Recupera la lista completa de clientes registrados.
 * @returns {Promise<object[]>} Arreglo con todos los clientes.
 */
export async function findAllClients() {
  const collection = await getClientsCollection();
  return collection.find().toArray();
}

/**
 * Busca un cliente específico por su identificador.
 * @param {string} id - Identificador del cliente en formato string.
 * @returns {Promise<object|null>} Documento del cliente o null si no existe.
 */
export async function findClientById(id) {
  const collection = await getClientsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Actualiza únicamente el estado del vehículo de un cliente.
 * @param {string} id - Identificador del cliente en formato string.
 * @param {('USA'|'CHILE'|'ADUANA_BOLIVIA'|'TALLER')} newStatus - Nuevo estado del vehículo.
 * @returns {Promise<import('mongodb').UpdateResult>} Resultado de la actualización.
 */
export async function updateClientStatus(id, newStatus) {
  const collection = await getClientsCollection();

  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { estadoAuto: newStatus } }
  );
}
