import { findClientById } from '../models/clientModel.js';
import { addPhotoLog, ESTADOS_VALIDOS, findPhotosByClientId } from '../models/photoModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

/**
 * Normaliza un identificador de cliente a un ObjectId hex de 24 caracteres.
 * @param {string} rawId - ID recibido desde la URL o body.
 * @returns {string|null} ID válido o null si no se puede interpretar.
 */
function normalizeClientId(rawId) {
  if (!rawId) return null;

  const trimmed = String(rawId).trim();

  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Sube archivos de imagen del vehículo y devuelve las URLs públicas.
 */
export async function uploadVehicleFiles(req, res) {
  try {
    if (!req.files?.length) {
      return sendError(res, 400, 'Debes seleccionar al menos una imagen');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = req.files.map((file) => `${baseUrl}/uploads/vehicles/${file.filename}`);

    return sendSuccess(res, 201, {
      message: `${urls.length} imagen(es) subida(s) correctamente`,
      urls,
    });
  } catch (error) {
    console.error('Error en uploadVehicleFiles:', error.message);
    return sendError(res, 500, 'Error interno al subir las imágenes');
  }
}

/**
 * Sube la captura de comprobante de depósito y devuelve la URL pública.
 */
export async function uploadComprobanteFile(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 400, 'Debes seleccionar una imagen de comprobante');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/comprobantes/${req.file.filename}`;

    return sendSuccess(res, 201, {
      message: 'Comprobante subido correctamente',
      url,
    });
  } catch (error) {
    console.error('Error en uploadComprobanteFile:', error.message);
    return sendError(res, 500, 'Error interno al subir el comprobante');
  }
}

/**
 * Registra una nueva foto en el historial logístico de un cliente.
 */
export async function uploadPhotoRecord(req, res) {
  try {
    const clienteId = normalizeClientId(req.body.clienteId ?? req.params.clientId);
    const { estadoAlMomento, fotoUrl } = req.body;

    if (!clienteId || !estadoAlMomento || !fotoUrl) {
      return sendError(res, 400, 'Los campos clienteId, estadoAlMomento y fotoUrl son requeridos');
    }

    if (!ESTADOS_VALIDOS.includes(estadoAlMomento)) {
      return sendError(
        res,
        400,
        `El estado del vehículo debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`
      );
    }

    const cliente = await findClientById(clienteId);
    if (!cliente) {
      return sendError(res, 404, 'Cliente no encontrado');
    }

    const resultado = await addPhotoLog({
      clienteId,
      estadoAlMomento,
      fotoUrl,
    });

    return sendSuccess(res, 201, {
      id: resultado.insertedId.toString(),
      message: 'Foto registrada correctamente',
      clienteId,
      estadoAlMomento,
      fotoUrl,
    });
  } catch (error) {
    console.error('Error en uploadPhotoRecord:', error.message);
    return sendError(res, 500, 'Error interno al registrar la foto');
  }
}

/**
 * Obtiene el historial fotográfico logístico de un cliente.
 * @param {import('express').Request} req - Petición con clientId en los parámetros de la URL.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getClientPhotos(req, res) {
  try {
    const clientId = normalizeClientId(req.params.clientId);

    if (!clientId) {
      return sendError(res, 400, 'Identificador de cliente inválido');
    }

    const fotos = await findPhotosByClientId(clientId);

    return sendSuccess(res, 200, fotos);
  } catch (error) {
    console.error('Error en getClientPhotos:', error.message);
    return sendError(res, 400, 'No se pudo obtener el historial de fotos. Verifique el identificador');
  }
}
