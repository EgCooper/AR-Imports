import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { sendError } from '../utils/apiResponse.js';

dotenv.config();

/**
 * Protege rutas privadas verificando un token JWT válido en el encabezado Authorization.
 * @param {import('express').Request} req - Petición HTTP entrante.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @param {import('express').NextFunction} next - Función para continuar al siguiente middleware.
 * @returns {void|import('express').Response}
 */
export function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Acceso denegado. No autorizado');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch {
    return sendError(res, 401, 'Acceso denegado. No autorizado');
  }
}
