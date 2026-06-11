/**
 * Envía una respuesta exitosa estandarizada al cliente.
 * @param {import('express').Response} res - Objeto response de Express.
 * @param {number} statusCode - Código HTTP de la respuesta.
 * @param {unknown} data - Datos a devolver en el cuerpo de la respuesta.
 * @returns {import('express').Response}
 */
export function sendSuccess(res, statusCode, data) {
  return res.status(statusCode).json({ success: true, data });
}

/**
 * Envía una respuesta de error estandarizada al cliente.
 * @param {import('express').Response} res - Objeto response de Express.
 * @param {number} statusCode - Código HTTP del error.
 * @param {string} message - Mensaje descriptivo del error.
 * @returns {import('express').Response}
 */
export function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}
