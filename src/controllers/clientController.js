import {
  createClient,
  findAllClients,
  findClientById,
  updateClientStatus,
} from '../models/clientModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

const ESTADOS_VALIDOS = ['USA', 'CHILE', 'ADUANA_BOLIVIA', 'TALLER'];

/**
 * Registra un nuevo cliente con su vehículo asociado.
 * @param {import('express').Request} req - Petición con los datos del cliente en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function registerClient(req, res) {
  try {
    const {
      nombreCompleto,
      telefono,
      vin,
      lote,
      fotoAutoUrl,
      costoTotalPactado,
      estadoAuto,
    } = req.body;

    if (!nombreCompleto || !telefono || !vin || !lote || costoTotalPactado === undefined) {
      return sendError(
        res,
        400,
        'Los campos nombreCompleto, telefono, vin, lote y costoTotalPactado son requeridos'
      );
    }

    if (estadoAuto && !ESTADOS_VALIDOS.includes(estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const resultado = await createClient({
      nombreCompleto,
      telefono,
      vin,
      lote,
      fotoAutoUrl,
      costoTotalPactado,
      estadoAuto,
    });

    return sendSuccess(res, 201, {
      id: resultado.insertedId.toString(),
      nombreCompleto,
      telefono,
      vin,
      lote,
      fotoAutoUrl: fotoAutoUrl ?? null,
      costoTotalPactado,
      estadoAuto: estadoAuto ?? 'USA',
    });
  } catch (error) {
    return sendError(res, 500, 'Error al registrar el cliente');
  }
}

/**
 * Obtiene la lista completa de clientes registrados.
 * @param {import('express').Request} req - Petición HTTP.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getAllClients(req, res) {
  try {
    const clientes = await findAllClients();
    const clientesFormateados = clientes.map(({ _id, ...resto }) => ({
      id: _id.toString(),
      ...resto,
    }));

    return sendSuccess(res, 200, clientesFormateados);
  } catch (error) {
    return sendError(res, 500, 'Error al obtener los clientes');
  }
}

/**
 * Obtiene un cliente específico por su identificador.
 * @param {import('express').Request} req - Petición con el id en los parámetros de la URL.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getClientById(req, res) {
  try {
    const { id } = req.params;

    const cliente = await findClientById(id);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    return sendSuccess(res, 200, cliente);
  } catch (error) {
    return sendError(res, 400, 'Identificador de cliente inválido');
  }
}

/**
 * Actualiza el estado del vehículo de un cliente.
 * @param {import('express').Request} req - Petición con el id en la URL y estadoAuto en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { estadoAuto } = req.body;

    if (!estadoAuto || !ESTADOS_VALIDOS.includes(estadoAuto)) {
      return sendError(res, 400, `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const resultado = await updateClientStatus(id, estadoAuto);
    if (resultado.matchedCount === 0) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    return sendSuccess(res, 200, { id, estadoAuto });
  } catch (error) {
    return sendError(res, 400, 'Identificador de cliente inválido');
  }
}
